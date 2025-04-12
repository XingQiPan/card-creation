import fs from 'fs'
import path from 'path'
import { createClient } from 'webdav'
import archiver from 'archiver'
import { pipeline } from 'stream/promises'
import * as unzipper from 'unzipper'
import dotenv from 'dotenv'
import { EventEmitter } from 'events'

// 加载环境变量
dotenv.config()

// 默认自动保存间隔(毫秒)
const DEFAULT_SYNC_INTERVAL = 300000 // 5分钟

/**
 * WebDAV云同步服务
 * 提供数据备份、上传下载、恢复等功能
 */
class CloudSyncService extends EventEmitter {
  constructor(dataDir) {
    super()
    this.webdavClient = null
    this.DATA_DIR = dataDir
    this.backupInterval = null
    this.syncInterval = this._getSyncInterval()
    this.isBackupRunning = false
    this.isAutoBackupEnabled = this._getAutoBackupEnabled()
    this.initialize()
  }

  /**
   * 获取同步间隔时间（毫秒）
   * @private
   * @returns {number} 同步间隔时间（毫秒）
   */
  _getSyncInterval() {
    // 从环境变量获取同步间隔，确保最小为1分钟
    return process.env.CLOUD_SYNC_INTERVAL 
      ? Math.max(parseInt(process.env.CLOUD_SYNC_INTERVAL), 60000) 
      : DEFAULT_SYNC_INTERVAL
  }

  /**
   * 获取自动备份启用状态
   * @private
   * @returns {boolean} 是否启用自动备份
   */
  _getAutoBackupEnabled() {
    // 从环境变量获取自动备份启用状态，默认为true
    return process.env.AUTO_BACKUP_ENABLED === undefined ? true : process.env.AUTO_BACKUP_ENABLED.toLowerCase() === 'true'
  }

  /**
   * 初始化WebDAV客户端
   * @returns {boolean} 初始化是否成功
   */
  initialize() {
    try {
      // 更新同步间隔
      this.syncInterval = this._getSyncInterval()
      
      // 调试日志：输出当前同步间隔和自动备份状态
      console.log(`当前同步间隔: ${this.syncInterval}ms`)     
      console.log(`自动备份状态: ${this.isAutoBackupEnabled ? '已启用' : '已禁用'}`)
      this.webdavClient = this.configureWebDAVClient()
      if (this.webdavClient && this.isAutoBackupEnabled) {
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
   * @returns {Object|null} WebDAV客户端实例或null
   */
  configureWebDAVClient() {
    const webdavUrl = process.env.WEBDAV_URL
    const username = process.env.WEBDAV_USERNAME
    const password = process.env.WEBDAV_PASSWORD

    if (!webdavUrl || !username || !password) {
      console.warn('WebDAV配置不完整，云同步功能将不可用')
      return null
    }

    try {
      // 添加客户端选项，增加容错性
      const client = createClient(webdavUrl, {
        username,
        password,
        maxBodyLength: 100 * 1024 * 1024, // 100MB
        maxContentLength: 100 * 1024 * 1024, // 100MB
        headers: {
          'User-Agent': 'Card-Creation-App/1.0'
        }
      })
      console.log('WebDAV客户端创建成功')
      return client
    } catch (error) {
      console.error('创建WebDAV客户端失败:', error)
      return null
    }
  }

  /**
   * 检查WebDAV服务连接状态
   * @returns {Promise<Object>} 连接状态信息
   */
  async checkConnection() {
    if (!this.webdavClient) {
      return { success: false, error: 'WebDAV客户端未初始化' }
    }

    try {
      // 添加超时处理，防止长时间挂起
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('WebDAV连接超时')), 10000)
      );
      
      const checkExists = async () => {
        try {
          return await this.webdavClient.exists('/')
        } catch (err) {
          console.error('WebDAV连接测试出错:', err);
          return false;
        }
      };
      
      // 使用Promise.race进行超时控制
      const exists = await Promise.race([checkExists(), timeout]);
      
      return { 
        success: exists, 
        url: process.env.WEBDAV_URL,
        username: process.env.WEBDAV_USERNAME
      }
    } catch (error) {
      console.error('WebDAV连接检查失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 将本地数据目录压缩为zip文件
   * @param {string|null} backupName 备份文件名，可选
   * @returns {Promise<string>} 备份文件路径
   */
  async compressDataDir(backupName = null) {
    const timestamp = new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/[\/:]/g, '-').replace(/\s+/g, '_')
    const zipFileName = backupName || `data-backup-${timestamp}.zip`
    const backupDir = path.join(path.dirname(this.DATA_DIR), 'DataBackup')
    
    // 确保备份目录存在
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    
    const zipFilePath = path.join(backupDir, zipFileName)
    
    try {
      // 确保DATA_DIR存在
      if (!fs.existsSync(this.DATA_DIR)) {
        console.warn('数据目录不存在，创建空目录')
        fs.mkdirSync(this.DATA_DIR, { recursive: true })
      }
      
      return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipFilePath)
        const archive = archiver('zip', { zlib: { level: 9 } })
        
        output.on('close', () => {
          console.log(`成功创建备份: ${zipFilePath} (${archive.pointer()} bytes)`)
          resolve(zipFilePath)
        })
        
        archive.on('error', err => {
          console.error('压缩过程中出错:', err)
          reject(err)
        })
        
        output.on('error', err => {
          console.error('写入压缩文件时出错:', err)
          reject(err)
        })
        
        archive.pipe(output)
        
        // 添加数据目录到压缩包
        archive.directory(this.DATA_DIR, 'data')
        
        // 完成压缩
        archive.finalize()
      })
    } catch (error) {
      console.error('创建压缩包时出错:', error)
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
      
      // 使用Promise和超时控制上传过程
      const uploadWithTimeout = async () => {
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('上传超时，30秒内未完成')), 30000)
        );
        
        const uploadTask = this.webdavClient.putFileContents(remotePath, fileData, {
          overwrite: true,
          onUploadProgress: (progress) => {
            if (progress.percent) {
              console.log(`上传进度: ${Math.round(progress.percent * 100)}%`)
            }
          }
        });
        
        await Promise.race([uploadTask, timeout]);
        return true;
      };
      
      await uploadWithTimeout();
      console.log('上传完成')
      
      // 上传完成后删除本地临时zip文件
      try {
        fs.unlinkSync(zipFilePath)
        console.log('删除本地临时备份文件')
      } catch (unlinkError) {
        console.warn('删除本地临时文件失败:', unlinkError)
        // 不影响主流程，继续返回成功
      }
      
      return { success: true, path: remotePath }
    } catch (error) {
      console.error('上传备份失败:', error)
      // 保留本地文件以备手动处理
      if (fs.existsSync(zipFilePath)) {
        console.warn('上传失败，保留本地备份文件:', zipFilePath)
      }
      return { success: false, error: error.message || '上传过程中发生未知错误' }
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
   * 解压备份文件
   * @param {string} zipFilePath 备份文件路径
   * @returns {Promise<Object>} 解压结果
   */
  async extractBackup(zipFilePath) {
    try {
      // 创建备份当前数据的时间戳
      const timestamp = new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/[\/:]/g, '-').replace(/\s+/g, '_')
      const backupDir = path.join(path.dirname(this.DATA_DIR), 'DataBackup')
      
      // 确保备份目录存在
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }
      
      const localBackupFileName = `data-local-backup-${timestamp}.zip`
      const localBackupPath = path.join(backupDir, localBackupFileName)
      
      // 先备份当前数据
      await this.compressDataDir(localBackupFileName)
      
      console.log(`解压备份: ${zipFilePath} 到 ${path.dirname(this.DATA_DIR)}`)
      
      // 解压下载的备份到数据目录
      await pipeline(
        fs.createReadStream(zipFilePath),
        unzipper.Extract({ path: path.dirname(this.DATA_DIR) })
      )
      
      console.log('解压完成')
      
      // 解压完成后删除下载的zip文件
      try {
        fs.unlinkSync(zipFilePath)
        console.log('删除下载的临时备份文件')
      } catch (unlinkError) {
        console.warn('删除临时文件失败:', unlinkError)
      }
      
      return { success: true, localBackup: localBackupPath }
    } catch (error) {
      console.error('解压备份失败:', error)
      return { success: false, error: error.message || '解压过程中发生错误' }
    }
  }
  
  /**
   * 获取远程备份列表
   * @param {string} remoteDir 远程目录路径
   * @returns {Promise<Object>} 备份列表
   */
  async getBackupsList(remoteDir = '/CardCreationBackup') {
    if (!this.webdavClient) {
      throw new Error('WebDAV客户端未初始化')
    }
    
    try {
      // 确保远程目录存在
      const exists = await this.webdavClient.exists(remoteDir)
      if (!exists) {
        await this.webdavClient.createDirectory(remoteDir)
        return { success: true, backups: [] }
      }
      
      // 获取目录内容
      const contents = await this.webdavClient.getDirectoryContents(remoteDir)
      const backups = contents
        .filter(item => !item.type.includes('directory'))
        .map(item => ({
          name: item.basename,
          path: item.filename,
          size: item.size,
          lastModified: new Date(item.lastmod).toISOString()
        }))
      
      return { success: true, backups }
    } catch (error) {
      console.error('获取备份列表失败:', error)
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
   * @param {string} backupPath 本地备份文件路径
   * @returns {Promise<Object>} 删除结果
   */
  async deleteLocalBackup(backupPath) {
    try {
      // 检查备份文件是否存在
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: `本地备份文件不存在: ${backupPath}` }
      }
      
      // 删除文件
      await fs.promises.unlink(backupPath)
      
      console.log(`成功删除本地备份: ${backupPath}`)
      return { 
        success: true, 
        message: '备份已删除',
        path: backupPath
      }
    } catch (error) {
      console.error('删除本地备份失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 启动定时备份服务
   * @param {boolean} runInitialBackup 是否立即执行一次备份
   * @returns {boolean} 是否成功启动
   */
  startAutoBackup(runInitialBackup = true) {
    // 如果WebDAV客户端未初始化，则无法启动备份
    if (!this.webdavClient) {
      console.warn('WebDAV客户端未初始化，无法启动自动备份')
      return false
    }
    
    // 停止现有的定时任务
    this.stopAutoBackup()
    
    // 更新同步间隔
    this.syncInterval = this._getSyncInterval()
    
    console.log(`设置自动备份间隔: ${this.syncInterval}ms`)

    // 启动新的定时任务
    this.backupInterval = setInterval(async () => {
      if (this.isBackupRunning) {
        console.log('上一次备份任务仍在运行，跳过本次备份')
        return
      }
      
      this.isBackupRunning = true
      console.log('执行定时备份...')
      
      try {
        const result = await this.syncToCloud()
        if (result.success) {
          console.log('定时备份完成')
          this.emit('backup-completed', { success: true })
        } else {
          console.error('定时备份失败:', result.error)
          this.emit('backup-completed', { success: false, error: result.error })
        }
      } catch (error) {
        console.error('定时备份出错:', error)
        this.emit('backup-error', error)
      } finally {
        this.isBackupRunning = false
      }
    }, this.syncInterval)

    // 立即执行一次备份
    if (runInitialBackup) {
      this._runInitialBackup()
    }
    
    this.emit('backup-service-started')
    return true
  }
  
  /**
   * 执行初始备份
   * @private
   */
  _runInitialBackup() {
    // 使用setTimeout避免阻塞初始化流程
    setTimeout(async () => {
      if (this.isBackupRunning) return
      
      this.isBackupRunning = true
      try {
        console.log('执行初始备份...')
        const result = await this.syncToCloud()
        if (result.success) {
          console.log('初始备份完成')
          this.emit('initial-backup-completed', { success: true })
        } else {
          console.error('初始备份失败:', result.error)
          this.emit('initial-backup-completed', { success: false, error: result.error })
        }
      } catch (error) {
        console.error('初始备份失败:', error)
        this.emit('initial-backup-error', error)
      } finally {
        this.isBackupRunning = false
      }
    }, 5000) // 延迟5秒执行，避免与服务器启动冲突
  }
  
  /**
   * 停止定时备份服务
   */
  stopAutoBackup() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval)
      this.backupInterval = null
      console.log('已停止自动备份服务')
      this.emit('backup-service-stopped')
      return true
    }
    return false
  }

  /**
   * 获取自动备份状态
   * @returns {boolean} 是否启用自动备份
   */
  getAutoBackupStatus() {
    return this.isAutoBackupEnabled
  }

  /**
   * 设置自动备份状态
   * @param {boolean} enabled 是否启用自动备份
   * @returns {boolean} 设置是否成功
   */
  setAutoBackupStatus(enabled) {
    this.isAutoBackupEnabled = enabled
    
    // 更新环境变量中的配置（需要在调用此方法的地方保存到.env文件）
    process.env.AUTO_BACKUP_ENABLED = String(enabled)
    
    if (enabled) {
      return this.startAutoBackup(false)
    } else {
      return this.stopAutoBackup()
    }
  }

  /**
   * 重启定时备份服务
   * @param {boolean} runInitialBackup 是否立即执行一次备份
   * @returns {boolean} 是否成功重启
   */
  restartAutoBackup(runInitialBackup = false) {
    console.log('重启定时备份服务...')
    return this.startAutoBackup(runInitialBackup)
  }
}

// 导出CloudSyncService类
export default CloudSyncService;