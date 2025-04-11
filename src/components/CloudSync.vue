<template>
    <div class="cloud-sync-container">
      <h1>云同步</h1>
      
      <div class="tabs">
        <div class="tab" :class="{ active: activeTab === 'backups' }" @click="activeTab = 'backups'">备份管理</div>
        <div class="tab" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">同步设置</div>
      </div>
      
      <div class="cloud-sync-content">
        <!-- 备份管理页面 -->
        <div v-if="activeTab === 'backups'" class="backups-panel">
          <div class="action-buttons">
            <button class="primary-btn" @click="createBackup" :disabled="loading">创建备份</button>
            <button class="refresh-btn" @click="loadBackups" :disabled="loading">刷新列表</button>
            <button class="delete-btn" @click="confirmBatchDelete" :disabled="loading || !hasSelectedBackups">批量删除</button>
          </div>
          
          <div class="backup-lists">
            <!-- 云端备份 -->
            <div class="backup-section">
              <h2>云端备份</h2>
              <div v-if="loading" class="loading">加载中...</div>
              <div v-else-if="cloudBackups.length === 0" class="empty-list">未找到云端备份</div>
              <div v-else class="backup-list">
                <div v-for="(group, date) in groupedCloudBackups" :key="date" class="backup-group">
                  <div class="group-header">
                    <div class="group-header-left">
                      <input type="checkbox" 
                        :checked="isGroupSelected(date)" 
                        @change="toggleGroupSelection(date)">
                      <span class="group-date" @click="toggleGroup(date)">{{ date }}</span>
                    </div>
                    <div class="group-header-right">
                      <span class="group-count">{{ group.length }}个备份</span>
                      <span class="group-toggle">{{ expandedGroups[date] ? '▼' : '▶' }}</span>
                    </div>
                  </div>
                  <div class="group-items" v-if="expandedGroups[date]">
                    <div v-for="backup in group" :key="backup.path" class="backup-item" @click="handleBackupItemClick(backup, $event)">
                      <div class="backup-checkbox">
                        <input type="checkbox" v-model="backup.selected" @change="updateSelectedStatus">
                      </div>
                      <div class="backup-info">
                        <div class="backup-name">{{ formatBackupName(backup.name) }}</div>
                        <div class="backup-details">
                          <span>{{ formatTime(backup.lastModified) }}</span>
                          <span>{{ formatSize(backup.size) }}</span>
                        </div>
                      </div>
                      <div class="backup-actions">
                        <button class="action-btn restore" @click="confirmRestore(backup, 'cloud')">恢复</button>
                        <button class="action-btn delete" @click="confirmDelete(backup, 'cloud')">删除</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 本地备份 -->
            <div class="backup-section">
              <h2>本地备份</h2>
              <div v-if="loading" class="loading">加载中...</div>
              <div v-else-if="localBackups.length === 0" class="empty-list">未找到本地备份</div>
              <div v-else class="backup-list">
                <div v-for="backup in localBackups" :key="backup.path" class="backup-item" @click="handleBackupItemClick(backup, $event)">
                  <div class="backup-checkbox">
                    <input type="checkbox" v-model="backup.selected" @change="updateSelectedStatus">
                  </div>
                  <div class="backup-info">
                    <div class="backup-name">{{ formatBackupName(backup.name) }}</div>
                    <div class="backup-details">
                      <span>{{ formatDate(backup.lastModified) }}</span>
                      <span>{{ formatSize(backup.size) }}</span>
                    </div>
                  </div>
                  <div class="backup-actions">
                    <button class="action-btn restore" @click="confirmRestore(backup, 'local')">恢复</button>
                    <button class="action-btn delete" @click="confirmDelete(backup, 'local')">删除</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 同步设置页面 -->
        <div v-if="activeTab === 'settings'" class="settings-panel">
          <h2>WebDAV 设置</h2>
          <p>配置您的WebDAV服务以启用云同步功能</p>
          
          <div class="form-group">
            <label>WebDAV 服务器地址</label>
            <input v-model="settings.webdavUrl" placeholder="例如: https://dav.jianguoyun.com/dav/" />
          </div>
          
          <div class="form-group">
            <label>用户名</label>
            <input v-model="settings.webdavUsername" placeholder="WebDAV 账号用户名" />
          </div>
          
          <div class="form-group">
            <label>密码</label>
            <input type="password" v-model="settings.webdavPassword" placeholder="WebDAV 账号密码" />
          </div>
          
          <div class="form-group">
            <label>自动保存频率(分钟)</label>
            <input type="number" v-model="settings.autoSaveInterval" min="1" max="60" />
          </div>
          
          <div class="action-buttons">
            <button class="primary-btn" @click="saveSettings">保存设置</button>
            <button class="secondary-btn" @click="testConnection">测试连接</button>
          </div>
          
          <div v-if="connectionStatus" :class="['status-message', connectionStatus.success ? 'success' : 'error']">
            {{ connectionStatus.message }}
          </div>
          
          <div class="settings-info">
            <h3>支持的WebDAV服务</h3>
            <ul>
              <li>坚果云</li>
              <li>NextCloud</li>
              <li>Box.com</li>
              <li>其他支持WebDAV的云存储服务</li>
            </ul>
          </div>
        </div>
      </div>
      
      <!-- 确认对话框 -->
      <transition name="dialog-fade">
        <div v-if="confirmDialog.show" class="dialog-backdrop">
          <div class="dialog-container">
            <div class="dialog-content">
              <h2 class="dialog-title">{{ confirmDialog.title }}</h2>
              <p class="dialog-message">{{ confirmDialog.message }}</p>
              <div class="dialog-actions">
                <button class="dialog-btn cancel" @click="confirmDialog.show = false">取消</button>
                <button class="dialog-btn confirm" @click="executeConfirmedAction">确认</button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, onMounted, computed } from 'vue'
  
  // 状态变量
  const activeTab = ref('backups')
  const loading = ref(false)
  const cloudBackups = ref([])
  const localBackups = ref([])
  const expandedGroups = ref({})

  // 计算选中的备份数量
  const hasSelectedBackups = computed(() => {
    const cloudSelected = cloudBackups.value.flatMap(backup => backup.selected || false).some(Boolean)
    const localSelected = localBackups.value.some(backup => backup.selected)
    return cloudSelected || localSelected
  })

  // 检查组是否全部选中
  const isGroupSelected = (date) => {
    const group = groupedCloudBackups.value[date]
    return group && group.length > 0 && group.every(backup => backup.selected)
  }

  // 切换组的选中状态
  const toggleGroupSelection = (date) => {
    const group = groupedCloudBackups.value[date]
    const newState = !isGroupSelected(date)
    group.forEach(backup => backup.selected = newState)
    updateSelectedStatus()
  }

  // 处理备份项点击事件
  const handleBackupItemClick = (backup, event) => {
    // 如果点击的是按钮或复选框，则不处理
    if (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT') {
      return
    }
    
    backup.selected = !backup.selected
    updateSelectedStatus()
  }
  
  // 更新选中状态
  const updateSelectedStatus = () => {
    // 触发响应式更新
    cloudBackups.value = [...cloudBackups.value]
    localBackups.value = [...localBackups.value]
  }
  
  const groupedCloudBackups = computed(() => {
    const groups = {}
    cloudBackups.value.forEach(backup => {
      const date = formatDate(backup.lastModified)
      if (!groups[date]) {
        groups[date] = []
        expandedGroups.value[date] = true
      }
      groups[date].push(backup)
    })
    return groups
  })
  
  const toggleGroup = (date) => {
    expandedGroups.value[date] = !expandedGroups.value[date]
  }
  const settings = reactive({
    webdavUrl: '',
    webdavUsername: '',
    webdavPassword: '',
    autoSaveInterval: 5 // 默认5分钟
  })
  const connectionStatus = ref(null)
  const confirmDialog = reactive({
    show: false,
    title: '',
    message: '',
    action: null,
    data: null,
    type: ''
  })
  
  // 计算属性
  const baseUrl = computed(() => {
    // 可以根据环境配置不同的 URL
    return 'http://localhost:3000'
  })
  
  // 生命周期钩子
  onMounted(() => {
    loadBackups()
    loadSettings()
  })
  
  // 方法
  // 加载备份
  const loadBackups = async () => {
    loading.value = true
    
    try {
      // 加载云端备份
      const cloudResponse = await fetch(`${baseUrl.value}/api/cloud/backups`)
      const cloudData = await cloudResponse.json()
      
      if (cloudData.success) {
        cloudBackups.value = cloudData.backups || []
        cloudBackups.value.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
      }
      
      // 加载本地备份
      const localResponse = await fetch(`${baseUrl.value}/api/local/backups`)
      const localData = await localResponse.json()
      
      if (localData.success) {
        localBackups.value = localData.backups || []
        localBackups.value.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
      }
    } catch (error) {
      console.error('加载备份列表失败:', error)
    } finally {
      loading.value = false
    }
  }
  
  // 创建备份
  const createBackup = async () => {
    loading.value = true
    
    try {
      const response = await fetch(`${baseUrl.value}/api/cloud/sync`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        // 刷新备份列表
        loadBackups()
      } else {
        alert(`备份创建失败: ${data.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('创建备份失败:', error)
      alert(`备份创建失败: ${error.message}`)
    } finally {
      loading.value = false
    }
  }
  
  // 加载设置
  const loadSettings = async () => {
    try {
      // 这里从本地存储加载设置
      const savedSettings = localStorage.getItem('webdav-settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        settings.webdavUrl = parsed.webdavUrl || ''
        settings.webdavUsername = parsed.webdavUsername || ''
        settings.webdavPassword = parsed.webdavPassword || ''
        // 将毫秒转换为分钟显示
        if (parsed.autoSaveInterval) {
          settings.autoSaveInterval = Math.round(parsed.autoSaveInterval / 60000)
        }
      }
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }
  
  // 保存设置
  const saveSettings = async () => {
    try {
      // 验证输入
      if (!settings.webdavUrl || !settings.webdavUsername || !settings.webdavPassword) {
        alert('请填写所有必填字段')
        return
      }
      
      // 保存到本地存储
      localStorage.setItem('webdav-settings', JSON.stringify({
        webdavUrl: settings.webdavUrl,
        webdavUsername: settings.webdavUsername,
        webdavPassword: settings.webdavPassword !== '********' ? settings.webdavPassword : undefined,
        // 将分钟转换为毫秒
        autoSaveInterval: settings.autoSaveInterval * 60000
      }))
      
      // 写入到 .env 文件 (需要通过服务器操作)
      const response = await fetch(`${baseUrl.value}/api/settings/webdav`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webdavUrl: settings.webdavUrl,
          webdavUsername: settings.webdavUsername,
          webdavPassword: settings.webdavPassword !== '********' ? settings.webdavPassword : undefined,
          // 将分钟转换为毫秒
          autoSaveInterval: settings.autoSaveInterval* 60000
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        connectionStatus.value = {
          success: true,
          message: '设置已保存'
        }
      } else {
        connectionStatus.value = {
          success: false,
          message: `保存设置失败: ${data.error || '未知错误'}`
        }
      }
    } catch (error) {
      console.error('保存设置失败:', error)
      connectionStatus.value = {
        success: false,
        message: `保存设置失败: ${error.message}`
      }
    }
  }
  
  // 测试连接
  const testConnection = async () => {
    try {
      const response = await fetch(`${baseUrl.value}/api/cloud/status`)
      const data = await response.json()
      
      connectionStatus.value = {
        success: data.success,
        message: data.success ? 'WebDAV连接成功' : `连接失败: ${data.error || '未知错误'}`
      }
    } catch (error) {
      console.error('测试连接失败:', error)
      connectionStatus.value = {
        success: false,
        message: `测试连接失败: ${error.message}`
      }
    }
  }
  
  // 格式化方法
  const formatBackupName = (name) => {
    // 示例: 从 data-backup-2023-05-16T14-30-00.zip 提取日期
    const match = name.match(/data-backup-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.zip/)
    if (match) {
      const timestamp = match[1].replace('T', ' ').replace(/-/g, ':')
      return `备份 (${timestamp})`
    }
    return name
  }
  
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('zh-CN')
  }
  
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})
  }
  
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }
  
  // 确认对话框函数
  const confirmRestore = (backup, type) => {
    confirmDialog.show = true
    confirmDialog.title = '恢复备份'
    confirmDialog.message = `确定要恢复备份 "${formatBackupName(backup.name)}" 吗？当前数据将被替换，但会先创建本地备份。`
    confirmDialog.action = 'restore'
    confirmDialog.data = backup
    confirmDialog.type = type
  }
  
  const confirmDelete = (backup, type) => {
    confirmDialog.show = true
    confirmDialog.title = '删除备份'
    confirmDialog.message = `确定要删除备份 "${formatBackupName(backup.name)}" 吗？此操作无法撤销。`
    confirmDialog.action = 'delete'
    confirmDialog.data = backup
    confirmDialog.type = type
  }

  // 批量删除确认
  const confirmBatchDelete = () => {
    const selectedCloudBackups = cloudBackups.value.filter(backup => backup.selected)
    const selectedLocalBackups = localBackups.value.filter(backup => backup.selected)
    const totalSelected = selectedCloudBackups.length + selectedLocalBackups.length

    confirmDialog.show = true
    confirmDialog.title = '批量删除备份'
    confirmDialog.message = `确定要删除选中的 ${totalSelected} 个备份吗？此操作无法撤销。`
    confirmDialog.action = 'batchDelete'
    confirmDialog.data = { selectedCloudBackups, selectedLocalBackups }
  }
  
  const executeConfirmedAction = async () => {
    if (confirmDialog.action === 'restore') {
      await restoreBackup(confirmDialog.data, confirmDialog.type)
    } else if (confirmDialog.action === 'delete') {
      await deleteBackup(confirmDialog.data, confirmDialog.type)
    } else if (confirmDialog.action === 'batchDelete') {
      const { selectedCloudBackups, selectedLocalBackups } = confirmDialog.data
      const totalSelected = selectedCloudBackups.length + selectedLocalBackups.length
      
      loading.value = true
      
      // 更新确认对话框显示删除进度
      confirmDialog.title = '批量删除中'
      confirmDialog.message = `正在删除备份，请稍候...`
      
      try {
        // 使用现有对话框显示进度
        const progressDialog = reactive({
          show: true,
          title: '批量删除中',
          message: `正在删除备份`,
          progress: 0
        })
        
        // 批量删除函数
        const batchDelete = async (backups, type) => {
          const BATCH_SIZE = 5 // 限制并发数量
          
          for (let i = 0; i < backups.length; i += BATCH_SIZE) {
            const batch = backups.slice(i, i + BATCH_SIZE)
            await Promise.all(batch.map(async (backup) => {
              try {
                await deleteBackup(backup, type, false)
              } catch (error) {
                console.error(`删除备份失败: ${backup.name}`, error)
                throw error
              } finally {
                progressDialog.progress++
                progressDialog.message = `正在删除备份 (${progressDialog.progress}/${totalSelected})`
              }
            }))
          }
        }
        
        // 并行执行云端和本地备份删除
        await Promise.all([
          batchDelete(selectedCloudBackups, 'cloud'),
          batchDelete(selectedLocalBackups, 'local')
        ])
        
        // 清除所有备份的选中状态
        cloudBackups.value.forEach(backup => backup.selected = false)
        localBackups.value.forEach(backup => backup.selected = false)
        
        // 显示完成提示
        confirmDialog.title = '操作完成'
        confirmDialog.message = `成功删除 ${totalSelected} 个备份`
        confirmDialog.action = 'refresh'
        confirmDialog.show = true
        
        await loadBackups()
      } catch (error) {
        console.error('批量删除失败:', error)
        confirmDialog.title = '操作失败'
        confirmDialog.message = `批量删除失败: ${error.message}`
        confirmDialog.show = true
      } finally {
        loading.value = false
      }
    }
    
    confirmDialog.show = false
  }
  
  // 恢复备份
  const restoreBackup = async (backup, type) => {
    loading.value = true
    
    try {
      const endpoint = type === 'cloud' ? 'cloud/restore' : 'local/restore'
      
      const response = await fetch(`${baseUrl.value}/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ backupPath: backup.path })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('备份恢复成功，应用即将重启以完成恢复过程')
        loadBackups()
        // 触发应用重启
        window.location.reload(true)
      } else {
        alert(`恢复备份失败: ${data.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('恢复备份失败:', error)
      alert(`恢复备份失败: ${error.message}`)
    } finally {
      loading.value = false
    }
  }
  
  // 删除备份
  const deleteBackup = async (backup, type, showAlert = true) => {
    loading.value = true
    
    try {
      const endpoint = type === 'cloud' ? 'cloud/backups' : 'local/backups'
      
      const response = await fetch(`${baseUrl.value}/api/${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ backupPath: backup.path })
      })
      
      const data = await response.json()
      
      if (data.success) {
        if (showAlert) {
          alert('备份已删除')
          loadBackups()
        }
      } else {
        throw new Error(data.error || '未知错误')
      }
    } catch (error) {
      console.error('删除备份失败:', error)
      if (showAlert) {
        alert(`删除备份失败: ${error.message}`)
      } else {
        throw error
      }
    } finally {
      loading.value = false
    }
  }
  </script>
  
  <style scoped>
  .cloud-sync-container {
    padding: 20px;
    height: 100%;
    overflow-y: auto;
    position: relative;
  }
  
  h1, h2, h3 {
    margin-bottom: 20px;
    color: #333;
  }
  
  .tabs {
    display: flex;
    margin-bottom: 20px;
    border-bottom: 1px solid #ddd;
  }
  
  .tab {
    padding: 10px 20px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.3s;
  }
  
  .tab.active {
    border-bottom: 2px solid #1e88e5;
    color: #1e88e5;
    font-weight: 500;
  }
  
  .cloud-sync-content {
    background-color: #fff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  /* 备份面板样式 */
  .action-buttons {
    margin-bottom: 20px;
    display: flex;
    gap: 10px;
  }

  .delete-btn {
    background-color: #dc3545;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.3s;
  }

  .delete-btn:hover {
    background-color: #c82333;
  }

  .delete-btn:disabled {
    background-color: #dc354580;
    cursor: not-allowed;
  }
  
  .primary-btn, .secondary-btn, .refresh-btn {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.3s;
  }
  
  .primary-btn {
    background-color: #1e88e5;
    color: white;
  }
  
  .primary-btn:hover {
    background-color: #1976d2;
  }
  
  .secondary-btn {
    background-color: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
  }
  
  .secondary-btn:hover {
    background-color: #e0e0e0;
  }
  
  .refresh-btn {
    background-color: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
  }
  
  .backup-lists {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  
  .backup-section {
    background-color: #f9f9f9;
    border-radius: 6px;
    padding: 15px;
  }
  
  .backup-list {
    max-height: 400px;
    overflow-y: auto;
  }
  
  .backup-group {
    margin-bottom: 10px;
    border: 1px solid #eee;
    border-radius: 4px;
  }
  
  .group-header {
    padding: 10px;
    background-color: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 500;
  }

  .group-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .group-header-left input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #1e88e5;
  }

  .group-header-left .group-date {
    cursor: pointer;
  }

  .group-header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .group-date {
    flex: 1;
  }
  
  .group-count {
    margin: 0 10px;
    color: #666;
    font-size: 0.9em;
  }
  
  .group-toggle {
    width: 20px;
    text-align: center;
  }
  
  .group-items {
    padding: 5px;
  }
  
  .backup-item {
    display: flex;
    align-items: center;
    padding: 10px;
    margin-bottom: 8px;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .backup-checkbox {
    margin-right: 12px;
  }

  .backup-checkbox input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #1e88e5;
  }

  .backup-info {
    flex: 1;
  }

  .backup-actions {
    display: flex;
    gap: 8px;
  }
  
  .backup-info {
    flex: 1;
  }
  
  .backup-name {
    font-weight: 500;
    margin-bottom: 5px;
  }
  
  .backup-details {
    display: flex;
    gap: 15px;
    font-size: 0.85rem;
    color: #666;
  }
  
  .backup-actions {
    display: flex;
    gap: 8px;
  }
  
  .action-btn {
    padding: 5px 10px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 0.85rem;
  }
  
  .action-btn.restore {
    background-color: #4caf50;
    color: white;
  }
  
  .action-btn.delete {
    background-color: #f44336;
    color: white;
  }
  
  .empty-list, .loading {
    padding: 20px;
    text-align: center;
    color: #666;
  }
  
  /* 设置面板样式 */
  .settings-panel {
    max-width: 600px;
    margin: 0 auto;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
  }
  
  .form-group input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .status-message {
    margin-top: 15px;
    padding: 10px;
    border-radius: 4px;
  }
  
  .status-message.success {
    background-color: #e8f5e9;
    color: #2e7d32;
  }
  
  .status-message.error {
    background-color: #ffebee;
    color: #c62828;
  }
  
  .settings-info {
    margin-top: 30px;
    padding: 15px;
    background-color: #f5f5f5;
    border-radius: 4px;
  }
  
  .settings-info ul {
    padding-left: 20px;
  }
  
  .dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .dialog-container {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    max-width: 400px;
    width: 90%;
    position: relative;
    overflow: hidden;
  }

  .dialog-content {
    padding: 24px;
  }

  .dialog-title {
    margin: 0 0 16px;
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
  }

  .dialog-message {
    margin: 0 0 24px;
    color: #666;
    line-height: 1.5;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .dialog-btn {
    padding: 8px 20px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .dialog-btn.cancel {
    background-color: #f5f5f5;
    color: #666;
  }

  .dialog-btn.cancel:hover {
    background-color: #e8e8e8;
  }

  .dialog-btn.confirm {
    background-color: #1e88e5;
    color: white;
  }

  .dialog-btn.confirm:hover {
    background-color: #1976d2;
  }

  /* 对话框过渡动画 */
  .dialog-fade-enter-active,
  .dialog-fade-leave-active {
    transition: opacity 0.3s ease;
  }

  .dialog-fade-enter-from,
  .dialog-fade-leave-to {
    opacity: 0;
  }
  
  /* 响应式布局 */
  @media (max-width: 768px) {
    .backup-lists {
      grid-template-columns: 1fr;
    }
  }
  </style>