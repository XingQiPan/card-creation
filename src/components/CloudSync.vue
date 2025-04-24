<template>
  <div class="cloud-sync-container" style="max-width: 100%; padding: 0 10px;">
    <div class="sync-header">
      <h1>云同步管理</h1>
      <div class="status-indicator" :class="{ 'connected': connected, 'disconnected': !connected }">
        {{ connected ? '已连接' : '未连接' }}
      </div>
    </div>

    <div class="tabs">
      <div class="tab" :class="{ active: activeTab === 'backups' }" @click="activeTab = 'backups'">备份管理</div>
      <div class="tab" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">同步设置</div>
    </div>

    <div class="loading-overlay" v-if="loading">
      <div class="spinner"></div>
      <div class="loading-text">{{ loadingText }}</div>
    </div>

    <div class="error-message" v-if="errorMessage" style="background: white; color: black;">
      <div class="error-text">{{ errorMessage }}</div>
      <button class="close-button" @click="errorMessage = ''">×</button>
    </div>

    <div class="cloud-sync-content" style="width: 100%; max-width: 100%; height: calc(100vh - 150px); overflow-y: auto; padding: 0 10px;">
      <!-- 备份管理页面 -->
      <div v-if="activeTab === 'backups'" class="backups-panel">
        <div class="connection-info card" v-if="connectionInfo" style="max-width: 100%;">
          <h2>WebDAV连接信息</h2>
          <div class="info-grid">
            <div class="info-label">服务器:</div>
            <div class="info-value">{{ maskUrl(connectionInfo.url) }}</div>
            <div class="info-label">用户名:</div>
            <div class="info-value">{{ maskUsername(connectionInfo.username) }}</div>
            <div class="info-label">状态:</div>
            <div class="info-value status" :class="{ 'success': connected, 'error': !connected }">
              {{ connected ? '连接正常' : '连接失败' }}
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <button class="primary-btn" @click="createBackup" :disabled="loading || !connected">创建云备份</button>
          <button class="primary-btn" @click="createLocalBackup" :disabled="loading">创建本地备份</button>
          <button class="refresh-btn" @click="loadBackups" :disabled="loading">刷新列表</button>
          <button class="delete-btn" @click="confirmBatchDelete" :disabled="loading || !hasSelectedBackups">批量删除</button>
        </div>
        
        <div class="backup-lists">
          <!-- 云端备份 -->
          <div class="backup-section card" style="max-width: 100%;">
            <h2>云端备份</h2>
            <div v-if="loading && loadingText.includes('备份')" class="loading">加载中...</div>
            <div v-else-if="cloudBackups.length === 0" class="empty-list">
              <div class="empty-state">
                <div class="empty-icon">📦</div>
                <div class="empty-text">未找到云端备份</div>
                <button class="primary-btn small" @click="createLocalBackup" :disabled="loading">
                  创建第一个备份
                </button>
              </div>
            </div>
            <div v-else class="backup-list">
              <div v-for="(group, date) in groupedCloudBackups" :key="date" class="backup-group">
                <div class="group-header" @click="toggleGroup(date)">
                  <div class="group-header-left" @click.stop>
                    <input type="checkbox" 
                      :checked="isGroupSelected(date)" 
                      @change="toggleGroupSelection(date)">
                    <span class="group-date">{{ date }}</span>
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
                      <div class="backup-name">{{ backup.name }}</div>
                      <div class="backup-details">
                        <span>{{ formatTime(backup.lastModified) }}</span>
                        <span>{{ formatSize(backup.size) }}</span>
                      </div>
                    </div>
                    <div class="backup-actions">
                      <button class="action-btn restore" @click="confirmRestore(backup, 'cloud')">恢复</button>
                      <button class="action-btn rename" @click="openRenameDialog(backup, 'cloud')">重命名</button>
                      <button class="action-btn delete" @click="confirmDelete(backup, 'cloud')">删除</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 本地备份 -->
          <div class="backup-section card" style="max-width: 100%;">
            <h2>本地备份</h2>
            <div v-if="loading && loadingText.includes('备份')" class="loading">加载中...</div>
            <div v-else-if="localBackups.length === 0" class="empty-list">
              <div class="empty-state">
                <div class="empty-icon">📦</div>
                <div class="empty-text">未找到本地备份</div>
              </div>
            </div>
            <div v-else class="backup-list">
              <div v-for="(group, date) in groupedLocalBackups" :key="date" class="backup-group">
                <div class="group-header" @click="toggleLocalGroup(date)">
                  <div class="group-header-left" @click.stop>
                    <input type="checkbox" 
                      :checked="isLocalGroupSelected(date)" 
                      @change="toggleLocalGroupSelection(date)">
                    <span class="group-date">{{ date }}</span>
                  </div>
                  <div class="group-header-right">
                    <span class="group-count">{{ group.length }}个备份</span>
                    <span class="group-toggle">{{ expandedLocalGroups[date] ? '▼' : '▶' }}</span>
                  </div>
                </div>
                <div class="group-items" v-if="expandedLocalGroups[date]">
                  <div v-for="backup in group" :key="backup.path" class="backup-item" @click="handleBackupItemClick(backup, $event)">
                    <div class="backup-checkbox">
                      <input type="checkbox" v-model="backup.selected" @change="updateSelectedStatus">
                    </div>
                    <div class="backup-info">
                      <div class="backup-name">{{ backup.name }}</div>
                      <div class="backup-details">
                        <span>{{ formatDate(backup.lastModified) }}</span>
                        <span>{{ formatSize(backup.size) }}</span>
                      </div>
                    </div>
                    <div class="backup-actions">
                      <button class="action-btn restore" @click="confirmRestore(backup, 'local')">恢复</button>
                      <button class="action-btn rename" @click="openRenameDialog(backup, 'local')">重命名</button>
                      <button class="action-btn delete" @click="confirmDelete(backup, 'local')">删除</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 同步设置页面 -->
      <div v-if="activeTab === 'settings'" class="settings-panel card">
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
          <label>自动存档</label>
          <div class="auto-backup-controls">
            <label class="switch">
              <input type="checkbox" v-model="settings.autoBackupEnabled" />
              <span class="slider round"></span>
            </label>
            <span class="switch-label">{{ settings.autoBackupEnabled ? '已开启' : '已关闭' }}</span>
          </div>
        </div>
        
        <div class="form-group" v-if="settings.autoBackupEnabled">
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
    
    <!-- 重命名对话框 -->
    <transition name="dialog-fade">
      <div v-if="renameDialog.show" class="dialog-backdrop">
        <div class="dialog-container">
          <div class="dialog-content">
            <h2 class="dialog-title">重命名备份</h2>
            <div class="form-group">
              <label>新文件名</label>
              <input v-model="renameDialog.newName" placeholder="输入新的备份名称" />
              <small class="form-help">无需包含.zip扩展名</small>
            </div>
            <div v-if="renameDialog.error" class="rename-error">{{ renameDialog.error }}</div>
            <div class="dialog-actions">
              <button class="dialog-btn cancel" @click="renameDialog.show = false">取消</button>
              <button class="dialog-btn confirm" @click="executeRename">确认</button>
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
const loadingText = ref('加载中...')
const errorMessage = ref('')
const connected = ref(false)
const connectionInfo = ref(null)
const cloudBackups = ref([])
const localBackups = ref([])
const expandedGroups = ref({})
const backups = ref([]) // 兼容旧版本的备份列表

// 计算选中的备份数量
const hasSelectedBackups = computed(() => {
  const cloudSelected = cloudBackups.value.some(backup => backup.selected)
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
  // 直接修改响应式对象的属性值
  expandedGroups.value[date] = !expandedGroups.value[date]
}

const groupedLocalBackups = computed(() => {
  const groups = {}
  localBackups.value.forEach(backup => {
    const date = formatDate(backup.lastModified)
    if (!groups[date]) {
      groups[date] = []
      expandedLocalGroups.value[date] = true
    }
    groups[date].push(backup)
  })
  return groups
})

const expandedLocalGroups = ref({})

const toggleLocalGroup = (date) => {
  expandedLocalGroups.value[date] = !expandedLocalGroups.value[date]
}

const isLocalGroupSelected = (date) => {
  const group = groupedLocalBackups.value[date]
  return group && group.length > 0 && group.every(backup => backup.selected)
}

const toggleLocalGroupSelection = (date) => {
  const group = groupedLocalBackups.value[date]
  const newState = !isLocalGroupSelected(date)
  group.forEach(backup => backup.selected = newState)
  updateSelectedStatus()
}

const settings = reactive({
  webdavUrl: '',
  webdavUsername: '',
  webdavPassword: '',
  autoBackupEnabled: true, // 默认开启自动存档
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

const renameDialog = reactive({
  show: false,
  backup: null,
  type: '',
  newName: '',
  error: ''
})

// 计算属性
const baseUrl = computed(() => {
  // 可以根据环境配置不同的 URL
  return '/api'
})

// 生命周期钩子
onMounted(() => {
  checkConnection()
  loadSettings()
})

// 检查WebDAV连接状态
const checkConnection = async () => {
  loading.value = true
  loadingText.value = '检查WebDAV连接...'
  
  try {
    const response = await fetch(`${baseUrl.value}/cloud/status`)
    const data = await response.json()
    
    connected.value = data.success
    
    if (data.success) {
      connectionInfo.value = {
        url: data.url || '已配置 WebDAV 服务器',
        username: data.username || '已配置用户',
      }
      loadBackups()
    } else {
      errorMessage.value = `WebDAV连接失败: ${data.error || '请检查配置'}`
    }
  } catch (error) {
    console.error('检查连接失败:', error)
    connected.value = false
    errorMessage.value = `请求失败: ${error.message}`
  } finally {
    loading.value = false
  }
}

// 加载备份
const loadBackups = async () => {
  loading.value = true
  loadingText.value = '获取备份列表...'
  
  try {
    // 加载云端备份
    const cloudResponse = await fetch(`${baseUrl.value}/cloud/backups`)
    const cloudData = await cloudResponse.json()
    
    if (cloudData.success) {
      cloudBackups.value = cloudData.backups || []
      cloudBackups.value.forEach(backup => backup.selected = false)
      cloudBackups.value.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
    } else {
      errorMessage.value = `获取云端备份失败: ${cloudData.error || '未知错误'}`
    }
    
    // 加载本地备份
    const localResponse = await fetch(`${baseUrl.value}/local/backups`)
    const localData = await localResponse.json()
    
    if (localData.success) {
      localBackups.value = localData.backups || []
      localBackups.value.forEach(backup => backup.selected = false)
      localBackups.value.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
    } else {
      errorMessage.value = `获取本地备份失败: ${localData.error || '未知错误'}`
    }
  } catch (error) {
    console.error('加载备份列表失败:', error)
    errorMessage.value = `加载备份列表失败: ${error.message}`
  } finally {
    loading.value = false
  }
}

// 创建云备份
const createBackup = async () => {
  loading.value = true
  loadingText.value = '正在创建并上传备份...'
  
  try {
    const response = await fetch(`${baseUrl.value}/cloud/sync`, {
      method: 'POST'
    })
    
    const data = await response.json()
    
    if (data.success) {
      // 刷新备份列表
      loadBackups()
    } else {
      errorMessage.value = `备份创建失败: ${data.error || '未知错误'}`
      loading.value = false
    }
  } catch (error) {
    console.error('创建备份失败:', error)
    errorMessage.value = `备份创建失败: ${error.message}`
    loading.value = false
  }
}

// 创建本地备份
const createLocalBackup = async () => {
  loading.value = true
  loadingText.value = '正在创建本地备份...'
  
  try {
    const response = await fetch(`${baseUrl.value}/local/backup`, {
      method: 'POST'
    })
    
    const data = await response.json()
    
    if (data.success) {
      // 刷新备份列表
      loadBackups()
    } else {
      errorMessage.value = `本地备份创建失败: ${data.error || '未知错误'}`
      loading.value = false
    }
  } catch (error) {
    console.error('创建本地备份失败:', error)
    errorMessage.value = `本地备份创建失败: ${error.message}`
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
      // 加载自动备份状态（如果有）
      if (parsed.autoBackupEnabled !== undefined) {
        settings.autoBackupEnabled = parsed.autoBackupEnabled
      }
    }
    
    // 从服务器获取自动备份状态
    try {
      const response = await fetch(`${baseUrl.value}/cloud-sync/auto-backup`)
      const data = await response.json()
      
      if (data.success && data.data) {
        // 使用服务器的状态覆盖本地状态
        settings.autoBackupEnabled = data.data.enabled
      }
    } catch (serverError) {
      console.warn('从服务器获取自动备份状态失败:', serverError)
      // 如果服务器获取失败，使用本地设置或默认值
    }
  } catch (error) {
    console.error('加载设置失败:', error)
    errorMessage.value = `加载设置失败: ${error.message}`
  }
}

// 保存设置
const saveSettings = async () => {
  try {
    // 验证输入
    if (!settings.webdavUrl || !settings.webdavUsername || !settings.webdavPassword) {
      errorMessage.value = '请填写所有必填字段'
      return
    }
    
    // 保存到本地存储
    localStorage.setItem('webdav-settings', JSON.stringify({
      webdavUrl: settings.webdavUrl,
      webdavUsername: settings.webdavUsername,
      webdavPassword: settings.webdavPassword !== '********' ? settings.webdavPassword : undefined,
      autoBackupEnabled: settings.autoBackupEnabled,
      // 将分钟转换为毫秒
      autoSaveInterval: settings.autoSaveInterval * 60000
    }))
    
    console.log('保存自动备份设置:', settings.autoBackupEnabled)
    
    // 写入到 .env 文件 (需要通过服务器操作)
    const response = await fetch(`${baseUrl.value}/settings/webdav`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        webdavUrl: settings.webdavUrl,
        webdavUsername: settings.webdavUsername,
        webdavPassword: settings.webdavPassword !== '********' ? settings.webdavPassword : undefined,
        autoBackupEnabled: settings.autoBackupEnabled,
        // 将分钟转换为毫秒
        autoSaveInterval: settings.autoSaveInterval * 60000
      })
    })

    // 更新自动存档设置
    await fetch(`${baseUrl.value}/cloud-sync/auto-backup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enabled: settings.autoBackupEnabled,
        interval: settings.autoSaveInterval * 60000
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      connectionStatus.value = {
        success: true,
        message: '设置已保存'
      }
      // 保存设置后重新检查连接
      checkConnection()
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
    const response = await fetch(`${baseUrl.value}/cloud/status`)
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

// 掩码函数
const maskUrl = (url) => {
  if (!url) return ''
  // 只显示域名部分，隐藏路径和协议
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch (e) {
    return url.includes('://') ? url.split('://')[1].split('/')[0] : url
  }
}

const maskUsername = (username) => {
  if (!username) return ''
  // 只显示首尾字符，其余用*替代
  if (username.length <= 2) return username
  return username[0] + '*'.repeat(username.length - 2) + username[username.length - 1]
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

  if (totalSelected === 0) {
    errorMessage.value = '请先选择要删除的备份'
    return
  }

  confirmDialog.show = true
  confirmDialog.title = '批量删除备份'
  confirmDialog.message = `确定要删除选中的 ${totalSelected} 个备份吗？此操作无法撤销。`
  confirmDialog.action = 'batchDelete'
  confirmDialog.data = { selectedCloudBackups, selectedLocalBackups }
}

const executeConfirmedAction = async () => {
  confirmDialog.show = false;
  if (confirmDialog.action === 'restore') {
    await restoreBackup(confirmDialog.data, confirmDialog.type)
  } else if (confirmDialog.action === 'delete') {
    await deleteBackup(confirmDialog.data, confirmDialog.type)
  } else if (confirmDialog.action === 'batchDelete') {
    const { selectedCloudBackups, selectedLocalBackups } = confirmDialog.data
    const totalSelected = selectedCloudBackups.length + selectedLocalBackups.length
    
    loading.value = true
    loadingText.value = '正在删除备份 (0/' + totalSelected + ')'
    
    try {
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
              const currentTotal = i + Math.min(BATCH_SIZE, backups.length - i)
              const totalProgress = type === 'cloud' ? 
                currentTotal + selectedLocalBackups.length : 
                selectedCloudBackups.length + currentTotal
              loadingText.value = `正在删除备份 (${totalProgress}/${totalSelected})
${formatBackupName(backup.name)}`
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
      errorMessage.value = `成功删除 ${totalSelected} 个备份`
      
      await loadBackups()
    } catch (error) {
      console.error('批量删除失败:', error)
      errorMessage.value = `批量删除失败: ${error.message}`
    } finally {
      loading.value = false
    }
  }
  
  confirmDialog.show = false
}

// 恢复备份
const restoreBackup = async (backup, type) => {
  loading.value = true
  loadingText.value = '正在恢复备份...'
  
  try {
    const endpoint = type === 'cloud' ? 'cloud/restore' : 'local/restore'
    const response = await fetch(`${baseUrl.value}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ backupPath: backup.path })
    })
    
    const data = await response.json()
    
    if (data.success) {
      // 恢复成功后立即重启前端
      window.location.reload(true)
    } else {
      errorMessage.value = `恢复备份失败: ${data.error || '未知错误'}`
    }
  } catch (error) {
    console.error('恢复备份失败:', error)
    errorMessage.value = `恢复备份失败: ${error.message}`
  } finally {
    loading.value = false
  }
}

// 删除备份
const deleteBackup = async (backup, type, showAlert = true) => {
  if (showAlert) {
    loading.value = true
    loadingText.value = '正在删除备份...'
  }
  
  try {
    const endpoint = type === 'cloud' ? 'cloud/backups' : 'local/backups'
    
    const response = await fetch(`${baseUrl.value}/${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ backupPath: backup.path })
    })
    
    const data = await response.json()
    
    if (data.success) {
      if (type === 'cloud') {
        cloudBackups.value = cloudBackups.value.filter(b => b.path !== backup.path)
      } else {
        localBackups.value = localBackups.value.filter(b => b.path !== backup.path)
      }
      
      if (showAlert) {
        errorMessage.value = `备份 "${formatBackupName(backup.name)}" 已成功删除`
      }
    } else {
      if (showAlert) {
        errorMessage.value = `删除备份失败: ${data.error || '未知错误'}`
      }
    } 
  } catch (error) {
    console.error('删除备份失败:', error)
    if (showAlert) {
      errorMessage.value = `删除备份失败: ${error.message}`
    }
    throw error
  } finally {
    if (showAlert) {
      loading.value = false
    }
  }
}

// 打开重命名对话框
const openRenameDialog = (backup, type) => {
  renameDialog.show = true
  renameDialog.backup = backup
  renameDialog.type = type
  renameDialog.newName = backup.name.replace('.zip', '')
  renameDialog.error = ''
}

// 执行重命名操作
const executeRename = async () => {
  // 验证输入
  if (!renameDialog.newName.trim()) {
    renameDialog.error = '文件名不能为空'
    return
  }
  
  // 处理特殊字符
  const sanitizedName = renameDialog.newName.replace(/[\/\\:*?"<>|]/g, '-')
  if (sanitizedName !== renameDialog.newName) {
    renameDialog.newName = sanitizedName
    renameDialog.error = '文件名包含不允许的字符，已自动替换'
    return
  }
  
  loading.value = true
  loadingText.value = '正在重命名备份...'
  
  try {
    const endpoint = renameDialog.type === 'cloud' ? 'cloud/rename' : 'local/rename'
    const response = await fetch(`${baseUrl.value}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        backupPath: renameDialog.backup.path,
        newName: renameDialog.newName
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      // 关闭对话框
      renameDialog.show = false
      
      // 刷新备份列表
      loadBackups()
      
      // 显示成功消息
      errorMessage.value = `备份已重命名为 "${renameDialog.newName}"`
    } else {
      renameDialog.error = data.error || '重命名失败'
    }
  } catch (error) {
    console.error('重命名备份失败:', error)
    renameDialog.error = `重命名失败: ${error.message}`
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.cloud-sync-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.location-btn {
  background-color: #4a6fa5;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.location-btn:hover {
  background-color: #3a5a8c;
}

.location-btn:disabled {
  background-color: #a0a0a0;
  cursor: not-allowed;
}

.sync-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.sync-header h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.status-indicator {
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
}

.connected {
  background-color: #e6f7ec;
  color: #2d8a3e;
}

.disconnected {
  background-color: #ffe5e5;
  color: #e53e3e;
}

.tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.tab {
  padding: 10px 20px;
  cursor: pointer;
  font-weight: 500;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.tab:hover {
  color: #333;
}

.tab.active {
  color: #4a6cf7;
  border-bottom-color: #4a6cf7;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4a6cf7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 16px;
  color: #333;
}

.error-message {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  background-color: #ffe5e5;
  border-radius: 4px;
  margin-bottom: 20px;
  color: #e53e3e;
  position: relative;
}

.error-icon {
  font-size: 20px;
  margin-right: 10px;
}

.close-button {
  position: absolute;
  right: 10px;
  top: 10px;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #e53e3e;
}

.card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: 80px 1fr;
  grid-gap: 10px;
}

.info-label {
  font-weight: bold;
  color: #666;
}

.info-value {
  word-break: break-all;
}

.status.success {
  color: #2d8a3e;
}

.status.error {
  color: #e53e3e;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.primary-btn {
  background-color: #4a6cf7;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s;
}

.primary-btn:hover {
  background-color: #3a5ce5;
}

.primary-btn:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
}

.primary-btn.small {
  padding: 6px 12px;
  font-size: 14px;
}

.refresh-btn {
  background-color: #38b2ac;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s;
}

.refresh-btn:hover {
  background-color: #2c9a94;
}

.refresh-btn:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
}

.delete-btn {
  background-color: #e53e3e;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s;
}

.delete-btn:hover {
  background-color: #c53030;
}

.delete-btn:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
}

.secondary-btn {
  background-color: #edf2f7;
  color: #4a5568;
  border: 1px solid #e2e8f0;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
}

.secondary-btn:hover {
  background-color: #e2e8f0;
}

.backup-lists {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 768px) {
  .backup-lists {
    grid-template-columns: 1fr 1fr;
  }
}

.backup-section {
  height: 100%;
}

.backup-section h2 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.empty-list {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 10px;
  color: #a0aec0;
}

.empty-text {
  color: #718096;
  margin-bottom: 15px;
}

.backup-group {
  margin-bottom: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f7fafc;
  cursor: pointer;
}

.group-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.group-date {
  font-weight: 500;
  color: #4a5568;
}

.group-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.group-count {
  font-size: 14px;
  color: #718096;
}

.group-toggle {
  color: #4a5568;
  transition: transform 0.3s;
}

.group-items {
  border-top: 1px solid #e2e8f0;
}

.backup-item {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #e2e8f0;
  transition: background-color 0.3s;
  cursor: pointer;
}

.backup-item:last-child {
  border-bottom: none;
}

.backup-item:hover {
  background-color: #f7fafc;
}

.backup-checkbox {
  margin-right: 10px;
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
  font-size: 14px;
  color: #718096;
}

.backup-actions {
  display: flex;
  gap: 5px;
}

.action-btn {
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.action-btn.restore {
  background-color: #4299e1;
  color: white;
}

.action-btn.restore:hover {
  background-color: #3182ce;
}

.action-btn.delete {
  background-color: #f56565;
  color: white;
}

.action-btn.delete:hover {
  background-color: #e53e3e;
}

.action-btn.rename {
  background-color: #ed8936;
  color: white;
}

.action-btn.rename:hover {
  background-color: #dd6b20;
}

.rename-error {
  color: #e53e3e;
  margin-bottom: 10px;
  font-size: 14px;
}

.form-help {
  display: block;
  color: #718096;
  font-size: 12px;
  margin-top: 4px;
}

.settings-panel {
  max-width: 600px;
  margin: 0 auto;
}

.settings-panel h2 {
  margin-top: 0;
  margin-bottom: 10px;
}

.settings-panel p {
  color: #718096;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #4a5568;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.form-group input:focus {
  border-color: #4a6cf7;
  outline: none;
}

.status-message {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
  font-weight: 500;
}

.status-message.success {
  background-color: #e6fffa;
  color: #2c7a7b;
}

.status-message.error {
  background-color: #fff5f5;
  color: #c53030;
}

.settings-info {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.settings-info h3 {
  font-size: 16px;
  margin-bottom: 10px;
}

.settings-info ul {
  padding-left: 20px;
  color: #4a5568;
}

.settings-info li {
  margin-bottom: 5px;
}

.dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-container {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 90%;
  max-width: 500px;
  overflow: hidden;
}

.dialog-content {
  padding: 20px;
}

.dialog-title {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 20px;
  color: #2d3748;
}

.dialog-message {
  margin-bottom: 20px;
  color: #4a5568;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.dialog-btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.dialog-btn.cancel {
  background-color: #edf2f7;
  color: #4a5568;
  border: 1px solid #e2e8f0;
}

.dialog-btn.cancel:hover {
  background-color: #e2e8f0;
}

.dialog-btn.confirm {
  background-color: #4a6cf7;
  color: white;
  border: none;
}

.dialog-btn.confirm:hover {
  background-color: #3a5ce5;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.3s;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>