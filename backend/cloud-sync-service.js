import fs from 'fs'
import path from 'path'
import { createClient } from 'webdav'
import archiver from 'archiver'
import { pipeline } from 'stream/promises'
import * as unzipper from 'unzipper'
import dotenv from 'dotenv'
import AdmZip from 'adm-zip'
import moment from 'moment'

// 加载环境变量
dotenv.config()

/**
 * WebDAV云同步服务
 * 提供数据备份、上传下载、恢复等功能
 */
class CloudSyncService {
  constructor(dataDir) {
    this.webdavClient = null
    this.DATA_DIR = dataDir
    this.autoBackupTimer = null
    this.isAutoBackupEnabled = false
    this.syncInterval = 3600000 // 默认1小时
    this.initialize()
  }

  /**
   * 初始化WebDAV客户端
   * @returns {boolean} 初始化是否成功
   */
  initialize() {
    try {
      this.webdavClient = this.configureWebDAVClient()
      
      // 初始化自动备份状态
      this.syncInterval = parseInt(process.env.CLOUD_SYNC_INTERVAL) || 3600000
      this.isAutoBackupEnabled = process.env.AUTO_BACKUP_ENABLED === 'true'
      
      // 启动自动备份（如果启用）
      if (this.isAutoBackupEnabled) {
        this.startAutoBackup()
      }
      
      return !!this.webdavClient
    } catch (error) {
      console.error('初始化WebDAV客户端失败:', error)
      return false
    }
  }

  /**
   * 配置WebDAV客户端
   * @returns {object|null} WebDAV客户端实例
   */
  configureWebDAVClient() {
    try {
      // 从环境变量获取配置
      const url = process.env.WEBDAV_URL
      const username = process.env.WEBDAV_USERNAME
      const password = process.env.WEBDAV_PASSWORD
      
      if (!url || !username || !password) {
        console.log('WebDAV配置不完整，需要配置URL、用户名和密码')
        return null
      }
      
      // 创建WebDAV客户端
      const client = createClient(url, {
        username: username,
        password: password
      })
      
      return client
    } catch (error) {
      console.error('创建WebDAV客户端失败:', error)
      return null
    }
  }
  
  /**
   * 检查WebDAV连接状态
   * @returns {Promise<Object>} 连接状态
   */
  async checkConnection() {
    try {
      if (!this.webdavClient) {
        const client = this.configureWebDAVClient()
        if (!client) {
          return { 
            success: false, 
            error: '未配置WebDAV或配置不完整',
            url: process.env.WEBDAV_URL,
            username: process.env.WEBDAV_USERNAME
          }
        }
        this.webdavClient = client
      }
      
      // 测试连接
      await this.webdavClient.getDirectoryContents('/')
      
      return { 
        success: true,
        url: process.env.WEBDAV_URL,
        username: process.env.WEBDAV_USERNAME
      }
    } catch (error) {
      console.error('WebDAV连接失败:', error)
      return { 
        success: false, 
        error: error.message,
        url: process.env.WEBDAV_URL,
        username: process.env.WEBDAV_USERNAME
      }
    }
  }
  
  /**
   * 压缩数据目录，创建备份文件
   * @returns {Promise<string>} 生成的备份文件路径
   */
  async compressDataDir() {
    try {
      // 确保备份目录存在
      const backupDir = path.join(path.dirname(this.DATA_DIR), 'DataBackup')
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }
      
      // 创建ZIP文件
      const timestamp = moment().format('YYYY-MM-DDTHH-mm-ss')
      const zipFileName = `data-backup-${timestamp}.zip`
      const zipFilePath = path.join(backupDir, zipFileName)
      
      console.log(`创建备份: ${zipFilePath}`)
      
      const zip = new AdmZip()
      
      // 添加目录内容到ZIP文件
      const addDirectoryToZip = (dir, zipPath = '') => {
        const items = fs.readdirSync(dir)
        
        for (const item of items) {
          const fullPath = path.join(dir, item)
          const stats = fs.statSync(fullPath)
          
          // 跳过特定目录
          if (stats.isDirectory() && 
              (item === 'DataBackup' || item === 'uploads' || item === 'node_modules')) {
            continue
          }
          
          const entryPath = zipPath ? `${zipPath}/${item}` : item
          
          if (stats.isDirectory()) {
            zip.addFile(entryPath + '/', Buffer.alloc(0))
            addDirectoryToZip(fullPath, entryPath)
          } else {
            const content = fs.readFileSync(fullPath)
            zip.addFile(entryPath, content)
          }
        }
      }
      
      // 将数据目录添加到ZIP
      addDirectoryToZip(this.DATA_DIR, 'data')
      
      // 保存ZIP文件
      zip.writeZip(zipFilePath)
      
      return zipFilePath
    } catch (error) {
      console.error('创建备份失败:', error)
      throw error
    }
  }
  
  /**
   * 上传备份到WebDAV服务器
   * @param {string} zipFilePath 本地备份文件路径
   * @param {string} remoteDir 远程目录路径
   * @returns {Promise<Object>} 上传结果
   */
  async uploadBackup(zipFilePath, remoteDir = '/CardCreationBackup') {
    if (!this.webdavClient) {
      console.error('WebDAV客户端未初始化')
      if (fs.existsSync(zipFilePath)) {
        console.warn('由于WebDAV未配置，保留本地备份文件:', zipFilePath)
      }
      return { success: false, error: 'WebDAV客户端未初始化，但本地备份已创建' }
    }
    
    try {
      // 确保远程目录存在
      try {
        const exists = await this.webdavClient.exists(remoteDir)
        if (!exists) {
          console.log(`远程目录 ${remoteDir} 不存在，正在创建...`)
          await this.webdavClient.createDirectory(remoteDir)
        }
      } catch (dirError) {
        console.error(`创建远程目录 ${remoteDir} 失败:`, dirError)
        return { success: false, error: `创建远程目录失败: ${dirError.message}` }
      }
      
      const fileName = path.basename(zipFilePath)
      const remotePath = `${remoteDir}/${fileName}`
      
      // 检查本地文件是否存在
      if (!fs.existsSync(zipFilePath)) {
        return { success: false, error: `本地备份文件不存在: ${zipFilePath}` }
      }
      
      // 上传文件
      console.log(`开始上传 ${zipFilePath} 到 ${remotePath}`)
      const fileData = fs.readFileSync(zipFilePath)
      
      await this.webdavClient.putFileContents(remotePath, fileData, {
        overwrite: true,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.loaded && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100)
            console.log(`上传进度: ${progress}%`)
          }
        }
      })
      
      console.log('上传完成')
      
      return { 
        success: true, 
        localPath: zipFilePath,
        remotePath: remotePath
      }
    } catch (error) {
      console.error('上传备份失败:', error)
      return { success: false, error: error.message }
    }
  }
  
  /**
   * 从WebDAV下载备份
   * @param {string} remotePath 远程文件路径
   * @returns {Promise<Object>} 下载结果
   */
  async downloadBackup(remotePath) {
    if (!this.webdavClient) {
      throw new Error('WebDAV客户端未初始化')
    }
    
    try {
      // 确保备份目录存在
      const backupDir = path.join(path.dirname(this.DATA_DIR), 'DataBackup')
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }
      
      // 下载文件到临时位置
      const fileName = path.basename(remotePath)
      const tempFilePath = path.join(backupDir, fileName)
      
      console.log(`开始下载 ${remotePath} 到 ${tempFilePath}`)
      
      // 使用超时控制下载过程
      const downloadWithTimeout = async () => {
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('下载超时，60秒内未完成')), 60000)
        );
        
        const downloadTask = async () => {
          const fileData = await this.webdavClient.getFileContents(remotePath)
          fs.writeFileSync(tempFilePath, fileData)
          return tempFilePath
        };
        
        return await Promise.race([downloadTask(), timeout]);
      };
      
      const downloadedPath = await downloadWithTimeout();
      console.log(`下载完成: ${downloadedPath}`)
      
      return { success: true, path: tempFilePath }
    } catch (error) {
      console.error('下载备份失败:', error)
      return { success: false, error: error.message || '下载过程中发生错误' }
    }
  }
  
  /**
   * 从云端获取备份列表
   * @returns {Promise<Object>} 备份列表结果
   */
  async getBackupsList() {
    if (!this.webdavClient) {
      return { success: false, error: 'WebDAV客户端未初始化，请检查配置' }
    }
    
    try {
      const remoteDir = '/CardCreationBackup'
      
      // 检查目录是否存在，不存在则创建
      try {
        const exists = await this.webdavClient.exists(remoteDir)
        if (!exists) {
          console.log(`远程目录 ${remoteDir} 不存在，正在创建...`)
          await this.webdavClient.createDirectory(remoteDir)
        }
      } catch (dirError) {
        console.error(`检查或创建远程目录 ${remoteDir} 失败:`, dirError)
        return { success: false, error: `无法访问或创建备份目录: ${dirError.message}` }
      }
      
      // 获取目录内容
      const dirContents = await this.webdavClient.getDirectoryContents(remoteDir)
      
      // 过滤出ZIP文件
      const backups = dirContents
        .filter(item => !item.type.includes('directory') && item.basename.endsWith('.zip'))
        .map(item => ({
          name: item.basename,
          path: item.filename,
          size: item.size,
          lastModified: item.lastmod
        }))
      
      // 按修改时间降序排序
      backups.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
      
      return { success: true, backups }
    } catch (error) {
      console.error('获取备份列表失败:', error)
      return { success: false, error: error.message || '获取备份列表失败' }
    }
  }
  
  /**
   * 解压备份文件到数据目录
   * @param {string} zipFilePath 备份文件路径
   * @returns {Promise<Object>} 解压结果
   */
  async extractBackup(zipFilePath) {
    try {
      // 在恢复前，先创建当前数据的备份
      console.log('创建当前数据的备份...')
      const currentBackupPath = await this.compressDataDir().catch(err => {
        console.warn('在恢复前创建当前数据备份失败，继续恢复操作:', err)
        return null
      })
      
      // 解压备份文件
      console.log(`解压备份文件: ${zipFilePath}`)
      const zip = new AdmZip(zipFilePath)
      
      // 获取父目录
      const parentDir = path.dirname(this.DATA_DIR)
      
      // 解压到父目录，覆盖现有文件
      zip.extractAllTo(parentDir, true)
      
      console.log('备份解压完成')
      
      return {
        success: true,
        message: '备份恢复成功',
        localBackup: currentBackupPath ? path.basename(currentBackupPath) : null
      }
    } catch (error) {
      console.error('解压备份失败:', error)
      return { success: false, error: error.message }
    }
  }
  
  /**
   * 执行数据同步备份
   * @returns {Promise<Object>} 同步结果
   */
  async syncToCloud() {
    if (!this.webdavClient) {
      return { success: false, error: 'WebDAV客户端未初始化，请检查配置' }
    }
    
    try {
      // 压缩数据目录
      console.log('开始创建数据备份...')
      const zipPath = await this.compressDataDir()
      
      if (!fs.existsSync(zipPath)) {
        return { success: false, error: '备份文件创建失败' }
      }
      
      // 上传到WebDAV
      console.log('开始上传备份到云端...')
      const uploadResult = await this.uploadBackup(zipPath)
      
      return uploadResult
    } catch (error) {
      console.error('同步到云端失败:', error)
      return { success: false, error: error.message || '同步过程中发生错误' }
    }
  }
  
  /**
   * 从云端恢复备份
   * @param {string} remotePath 远程文件路径
   * @returns {Promise<Object>} 恢复结果
   */
  async restoreFromCloud(remotePath) {
    try {
      // 下载备份
      const downloadResult = await this.downloadBackup(remotePath)
      if (!downloadResult.success) {
        return downloadResult
      }
      
      // 解压备份
      const extractResult = await this.extractBackup(downloadResult.path)
      
      return { ...extractResult, restored: remotePath }
    } catch (error) {
      console.error('从云端恢复失败:', error)
      return { success: false, error: error.message }
    }
  }
  
  /**
   * 获取本地备份列表
   * @returns {Promise<Object>} 本地备份列表
   */
  async getLocalBackupsList() {
    try {
      const backupDir = path.join(path.dirname(this.DATA_DIR), 'DataBackup')
      
      // 确保备份目录存在
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
        return { success: true, backups: [] }
      }
      
      // 读取目录内容
      const files = await fs.promises.readdir(backupDir)
      
      // 获取文件信息
      const backups = await Promise.all(
        files
          .filter(file => file.endsWith('.zip'))
          .map(async file => {
            const filePath = path.join(backupDir, file)
            const stats = await fs.promises.stat(filePath)
            
            return {
              name: file,
              path: filePath,
              size: stats.size,
              lastModified: stats.mtime.toISOString()
            }
          })
      )
      
      // 按修改时间降序排序（最新的在前面）
      backups.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
      
      return { success: true, backups }
    } catch (error) {
      console.error('获取本地备份列表失败:', error)
      return { success: false, error: error.message }
    }
  }
  
  /**
   * 从本地备份恢复数据
   * @param {string} backupPath 本地备份文件路径
   * @returns {Promise<Object>} 恢复结果
   */
  async restoreFromLocal(backupPath) {
    try {
      // 检查备份文件是否存在
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: `本地备份文件不存在: ${backupPath}` }
      }
      
      // 解压备份
      const extractResult = await this.extractBackup(backupPath)
      
      return { ...extractResult, restored: path.basename(backupPath) }
    } catch (error) {
      console.error('从本地备份恢复失败:', error)
      return { success: false, error: error.message }
    }
  }
  
  /**
   * 删除本地备份文件
   * @param {string} backupPath 备份文件路径
   * @returns {Promise<Object>} 删除结果
   */
  async deleteLocalBackup(backupPath) {
    try {
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: '备份文件不存在' }
      }
      
      await fs.promises.unlink(backupPath)
      
      return { 
        success: true, 
        message: '本地备份已删除',
        deletedPath: backupPath
      }
    } catch (error) {
      console.error('删除本地备份失败:', error)
      return { success: false, error: error.message }
    }
  }
  
  /**
   * 获取自动备份状态
   * @returns {boolean} 是否启用自动备份
   */
  getAutoBackupStatus() {
    return this.isAutoBackupEnabled;
  }
  
  /**
   * 设置自动备份状态
   * @param {boolean} enabled 是否启用自动备份
   * @returns {boolean} 操作是否成功
   */
  setAutoBackupStatus(enabled) {
    try {
      this.isAutoBackupEnabled = enabled;
      
      if (enabled) {
        this.startAutoBackup();
      } else {
        this.stopAutoBackup();
      }
      
      return true;
    } catch (error) {
      console.error('设置自动备份状态失败:', error);
      return false;
    }
  }
  
  /**
   * 重命名云端备份文件
   * @param {string} remotePath 远程文件路径
   * @param {string} newName 新的文件名
   * @returns {Promise<Object>} 重命名结果
   */
  async renameCloudBackup(remotePath, newName) {
    if (!this.webdavClient) {
      console.error('WebDAV客户端未初始化，当前配置:', {
        url: process.env.WEBDAV_URL,
        username: process.env.WEBDAV_USERNAME,
        password: process.env.WEBDAV_PASSWORD ? '******' : '未配置'
      })
      return { success: false, error: 'WebDAV客户端未初始化，请检查配置' }
    }

    try {
      // 调试日志：打印输入参数
      console.log('重命名请求参数:', { remotePath, newName })

      // 文件名合法性校验
      const invalidChars = /[\\/:*?"<>|]/.test(newName)
      if (invalidChars) {
        console.error('非法文件名:', newName)
        return { 
          success: false, 
          error: '文件名包含非法字符（\\/:*?\"<>|）',
          invalidName: newName
        }
      }

      // 确保新名称有正确的格式和扩展名
      if (!newName.endsWith('.zip')) {
        newName = newName + '.zip'
      }

      // 获取目录路径和旧文件名
      const dirPath = path.posix.dirname(remotePath)
      const newPath = path.posix.join(dirPath, newName)
      
      // 调试日志：显示完整请求路径
      const fullRemotePath = path.posix.join(process.env.WEBDAV_URL, remotePath)
      const fullNewPath = path.posix.join(process.env.WEBDAV_URL, newPath)
      console.log('完整请求路径:', {
        original: fullRemotePath,
        new: fullNewPath
      })

      console.log('完整路径转换:', {
        originalRemote: remotePath,
        computedNewPath: newPath,
        webdavRoot: process.env.WEBDAV_URL
      })

      // WebDAV移动/重命名操作
      console.time('WebDAV重命名操作')
      const response = await this.webdavClient.moveFile(
        remotePath, 
        newPath,
        { overwrite: true }
      )
      console.timeEnd('WebDAV重命名操作')

      // 调试日志：输出服务器响应详情
      if (response) {
        console.log('WebDAV服务器响应:', {
          status: response?.status,
          headers: response?.headers,
          data: response?.data
        })
      } else {
        console.warn('WebDAV响应对象未定义')
      }

      return { 
        success: true, 
        oldPath: remotePath,
        newPath: newPath,
        newName: newName
      }
    } catch (error) {
      console.error('重命名云端备份失败 - 完整错误:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      })
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || '未知错误',
        statusCode: error.response?.status || 500
      }
    }
  }
  
  /**
   * 重命名本地备份文件
   * @param {string} backupPath 本地备份文件路径
   * @param {string} newName 新的文件名
   * @returns {Promise<Object>} 重命名结果
   */
  async renameLocalBackup(backupPath, newName) {
    try {
      // 检查备份文件是否存在
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: `本地备份文件不存在: ${backupPath}` }
      }
      
      // 确保新名称有正确的格式和扩展名
      if (!newName.endsWith('.zip')) {
        newName = newName + '.zip'
      }
      
      // 获取目录路径
      const dirPath = path.dirname(backupPath)
      const newPath = path.join(dirPath, newName)
      
      // 检查新文件名是否已存在
      if (fs.existsSync(newPath)) {
        return { success: false, error: `文件名 "${newName}" 已存在` }
      }
      
      // 重命名文件
      await fs.promises.rename(backupPath, newPath)
      
      return { 
        success: true, 
        oldPath: backupPath,
        newPath: newPath,
        newName: newName
      }
    } catch (error) {
      console.error('重命名本地备份失败:', error)
      return { success: false, error: error.message }
    }
  }
  
  /**
   * 启动自动备份
   */
  startAutoBackup() {
    // 如果已经有定时器在运行，先停止它
    this.stopAutoBackup();
    
    // 确保我们有有效的间隔时间，至少1分钟
    const interval = Math.max(this.syncInterval || 60000, 60000);
    
    console.log(`启动自动云同步，间隔: ${interval/60000} 分钟`);
    
    // 创建定时任务
    this.autoBackupTimer = setInterval(async () => {
      console.log('执行定时云同步...');
      try {
        // 只有当WebDAV配置有效时才执行同步
        if (this.webdavClient) {
          await this.syncToCloud();
        } else {
          console.warn('自动云同步未执行: WebDAV客户端未初始化');
        }
      } catch (error) {
        console.error('自动云同步失败:', error);
      }
    }, interval);
  }
  
  /**
   * 停止自动备份
   */
  stopAutoBackup() {
    if (this.autoBackupTimer) {
      console.log('停止自动云同步');
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
    }
  }
  
  /**
   * 重启自动备份(更新间隔或配置后调用)
   */
  restartAutoBackup() {
    // 从环境变量更新间隔
    this.syncInterval = parseInt(process.env.CLOUD_SYNC_INTERVAL) || 3600000;
    
    console.log(`重启自动云同步，新间隔: ${this.syncInterval/60000} 分钟`);
    
    // 如果自动备份已启用，重新启动
    if (this.isAutoBackupEnabled) {
      this.startAutoBackup();
    }
  }
}

// 导出CloudSyncService类
export default CloudSyncService;