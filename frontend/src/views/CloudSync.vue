<template>
  <div class="cloud-sync-container">
    <div class="sync-header">
      <h1>云同步管理</h1>
      <div class="status-indicator" :class="{ 'connected': connected, 'disconnected': !connected }">
        {{ connected ? '已连接' : '未连接' }}
      </div>
    </div>

    <div class="loading-overlay" v-if="loading">
      <div class="spinner"></div>
      <div class="loading-text">{{ loadingText }}</div>
    </div>

    <div class="error-message" v-if="errorMessage">
      <div class="error-icon">⚠️</div>
      <div class="error-text">{{ errorMessage }}</div>
      <button class="close-button" @click="errorMessage = ''">×</button>
    </div>

    <div class="connection-info card" v-if="connectionInfo">
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

    <div class="actions card">
      <h2>云同步操作</h2>
      <div class="button-group">
        <button class="primary-button" @click="syncNow" :disabled="!connected || loading">
          <span class="icon">🔄</span> 立即同步
        </button>
        <button class="secondary-button" @click="refreshBackups" :disabled="!connected || loading">
          <span class="icon">🔍</span> 刷新备份列表
        </button>
      </div>
    </div>

    <div class="backups card">
      <h2>备份列表</h2>
      
      <div class="empty-state" v-if="!backups || backups.length === 0">
        <div class="empty-icon">📦</div>
        <div class="empty-text">暂无备份数据</div>
        <button class="primary-button small" @click="syncNow" :disabled="!connected || loading">
          创建第一个备份
        </button>
      </div>

      <div class="backups-list" v-else>
        <div class="backup-item" v-for="(backup, index) in backups" :key="index">
          <div class="backup-details">
            <div class="backup-name">{{ formatBackupName(backup.name) }}</div>
            <div class="backup-meta">
              <span class="backup-size">{{ formatFileSize(backup.size) }}</span>
              <span class="backup-date">{{ formatDate(backup.lastModified) }}</span>
            </div>
          </div>
          <div class="backup-actions">
            <button class="action-button restore" @click="restoreBackup(backup)" :disabled="loading">
              <span class="icon">↩️</span> 恢复
            </button>
            <button class="action-button delete" @click="deleteBackup(backup)" :disabled="loading">
              <span class="icon">🗑️</span> 删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="confirm-dialog" v-if="confirmDialog.show">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>{{ confirmDialog.title }}</h3>
        </div>
        <div class="dialog-body">
          {{ confirmDialog.message }}
        </div>
        <div class="dialog-footer">
          <button class="secondary-button" @click="confirmDialog.show = false">取消</button>
          <button class="primary-button" @click="confirmAction">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "CloudSync",
  data() {
    return {
      connected: false,
      connectionInfo: null,
      backups: [],
      loading: false,
      loadingText: '加载中...',
      errorMessage: '',
      confirmDialog: {
        show: false,
        title: '',
        message: '',
        action: null,
        data: null
      }
    };
  },
  mounted() {
    this.checkConnection();
  },
  methods: {
    async checkConnection() {
      this.loading = true;
      this.loadingText = '检查WebDAV连接...';
      
      try {
        const response = await fetch('/api/cloud/status');
        const data = await response.json();
        
        this.connected = data.success;
        
        if (data.success) {
          this.connectionInfo = {
            url: data.url || '已配置 WebDAV 服务器',
            username: data.username || '已配置用户',
          };
          this.getBackups();
        } else {
          this.errorMessage = `WebDAV连接失败: ${data.error || '请检查配置'}`;
        }
      } catch (error) {
        this.connected = false;
        this.errorMessage = `请求失败: ${error.message}`;
      } finally {
        this.loading = false;
      }
    },
    
    async getBackups() {
      if (!this.connected) return;
      
      this.loading = true;
      this.loadingText = '获取备份列表...';
      
      try {
        const response = await fetch('/api/cloud/backups');
        const data = await response.json();
        
        if (data.success) {
          this.backups = data.backups || [];
          // 按日期排序，最新的在前面
          this.backups.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        } else {
          this.errorMessage = `获取备份列表失败: ${data.error}`;
        }
      } catch (error) {
        this.errorMessage = `请求失败: ${error.message}`;
      } finally {
        this.loading = false;
      }
    },
    
    async syncNow() {
      this.loading = true;
      this.loadingText = '正在创建并上传备份...';
      
      try {
        const response = await fetch('/api/cloud/sync', {
          method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
          // 刷新备份列表
          this.getBackups();
        } else {
          this.errorMessage = `同步失败: ${data.error}`;
          this.loading = false;
        }
      } catch (error) {
        this.errorMessage = `请求失败: ${error.message}`;
        this.loading = false;
      }
    },
    
    refreshBackups() {
      this.getBackups();
    },
    
    restoreBackup(backup) {
      this.confirmDialog = {
        show: true,
        title: '恢复备份',
        message: `确定要恢复备份 "${this.formatBackupName(backup.name)}" 吗？当前数据将被覆盖，但会先创建本地备份。`,
        action: this.doRestoreBackup,
        data: backup
      };
    },
    
    async doRestoreBackup(backup) {
      this.confirmDialog.show = false;
      this.loading = true;
      this.loadingText = '正在恢复备份...';
      
      try {
        const response = await fetch('/api/cloud/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ backupPath: backup.path })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // 显示成功消息
          alert(`备份已成功恢复，并在本地创建了备份文件: ${data.localBackup}`);
          // 刷新页面以加载恢复的数据
          window.location.reload();
        } else {
          this.errorMessage = `恢复失败: ${data.error}`;
        }
      } catch (error) {
        this.errorMessage = `请求失败: ${error.message}`;
      } finally {
        this.loading = false;
      }
    },
    
    deleteBackup(backup) {
      this.confirmDialog = {
        show: true,
        title: '删除备份',
        message: `确定要删除备份 "${this.formatBackupName(backup.name)}" 吗？此操作不可撤销。`,
        action: this.doDeleteBackup,
        data: backup
      };
    },
    
    async doDeleteBackup(backup) {
      this.confirmDialog.show = false;
      this.loading = true;
      this.loadingText = '正在删除备份...';
      
      try {
        const response = await fetch('/api/cloud/backups', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ backupPath: backup.path })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // 从列表中移除删除的备份
          this.backups = this.backups.filter(b => b.path !== backup.path);
        } else {
          this.errorMessage = `删除失败: ${data.error}`;
        }
      } catch (error) {
        this.errorMessage = `请求失败: ${error.message}`;
      } finally {
        this.loading = false;
      }
    },
    
    confirmAction() {
      if (this.confirmDialog.action && this.confirmDialog.data) {
        this.confirmDialog.action(this.confirmDialog.data);
      } else {
        this.confirmDialog.show = false;
      }
    },
    
    // 格式化工具函数
    formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(1) + ' MB';
    },
    
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN');
    },
    
    formatBackupName(name) {
      // 从名称中提取日期和时间
      const match = name.match(/data-backup-(.+)\.zip/);
      if (match && match[1]) {
        const dateStr = match[1].replace(/-/g, ':').substring(0, 19);
        return `备份 ${dateStr.replace('T', ' ')}`;
      }
      return name;
    },
    
    maskUrl(url) {
      if (!url) return '';
      // 只显示域名部分，隐藏路径和协议
      try {
        const urlObj = new URL(url);
        return urlObj.hostname;
      } catch (e) {
        return url.includes('://') ? url.split('://')[1].split('/')[0] : url;
      }
    },
    
    maskUsername(username) {
      if (!username) return '';
      // 只显示首尾字符，其余用*替代
      if (username.length <= 2) return username;
      return username[0] + '*'.repeat(username.length - 2) + username[username.length - 1];
    }
  }
};
</script>

<style scoped>
.cloud-sync-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
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

.card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

.card h2 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
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

.button-group {
  display: flex;
  gap: 10px;
}

.primary-button, .secondary-button, .action-button {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
}

.primary-button {
  background-color: #4CAF50;
  color: white;
}

.primary-button:hover {
  background-color: #3e8e41;
}

.secondary-button {
  background-color: #f1f1f1;
  color: #333;
}

.secondary-button:hover {
  background-color: #ddd;
}

.primary-button:disabled, .secondary-button:disabled, .action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.primary-button.small {
  padding: 6px 12px;
  font-size: 12px;
}

.icon {
  margin-right: 6px;
}

.backups-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.backup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
}

.backup-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.backup-meta {
  font-size: 12px;
  color: #666;
  display: flex;
  gap: 10px;
}

.backup-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  padding: 4px 8px;
  font-size: 12px;
}

.action-button.restore {
  background-color: #4dabf7;
  color: white;
}

.action-button.restore:hover {
  background-color: #3b8ac4;
}

.action-button.delete {
  background-color: #ff6b6b;
  color: white;
}

.action-button.delete:hover {
  background-color: #e53e3e;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  color: #888;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.empty-text {
  margin-bottom: 20px;
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
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  width: 40px;
  height: 40px;
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
  background-color: #fff0f0;
  border-left: 4px solid #ff6b6b;
  padding: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  position: relative;
}

.error-icon {
  margin-right: 10px;
  font-size: 18px;
}

.error-text {
  flex: 1;
}

.close-button {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #888;
}

.confirm-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.dialog-content {
  background-color: white;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  overflow: hidden;
}

.dialog-header {
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
}

.dialog-body {
  padding: 20px 16px;
  color: #333;
}

.dialog-footer {
  padding: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid #eee;
}
</style> 