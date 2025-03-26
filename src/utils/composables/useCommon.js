import { ref } from 'vue'
import { showToastMessage } from '../common'

export function useCommon() {
  // 通用的加载状态
  const isLoading = ref(false)
  
  // 通用的导出功能
  const exportData = (data, filename) => {
    try {
      const jsonStr = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      showToastMessage('导出成功', 'success')
    } catch (error) {
      console.error('导出失败:', error)
      showToastMessage('导出失败: ' + error.message, 'error')
    }
  }

  // 通用的导入功能
  const importData = (file, callback) => {
    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result)
          callback(importedData)
          showToastMessage('导入成功', 'success')
        } catch (error) {
          console.error('解析导入文件失败:', error)
          showToastMessage('导入失败: 无效的文件格式', 'error')
        }
      }
      reader.readAsText(file)
    } catch (error) {
      console.error('导入失败:', error)
      showToastMessage('导入失败: ' + error.message, 'error')
    }
  }

  // 保存数据到本地存储
  const saveToStorage = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data))
      return true
    } catch (error) {
      console.error('保存数据失败:', error)
      return false
    }
  }
  
  // 从本地存储加载数据
  const loadFromStorage = (key, defaultValue = null) => {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : defaultValue
    } catch (error) {
      console.error('加载数据失败:', error)
      return defaultValue
    }
  }
  
  // 删除本地存储中的数据
  const removeFromStorage = (key) => {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error('删除数据失败:', error)
      return false
    }
  }

  // 通用的时间格式化
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleString()
  }

  // 通用的响应时间格式化
  const formatResponseTime = (ms) => {
    if (ms < 1000) {
      return `${ms}毫秒`
    }
    return `${(ms / 1000).toFixed(2)}秒`
  }

  // 通用的文本处理
  const truncateText = (text, length = 30) => {
    if (!text) return ''
    return text.length > length ? text.slice(0, length) + '...' : text
  }

  // 通用的防抖处理
  const createDebounce = (fn, delay = 300) => {
    let timeoutId
    return (...args) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn(...args), delay)
    }
  }

  return {
    isLoading,
    exportData,
    importData,
    saveToStorage,
    loadFromStorage,
    removeFromStorage,
    formatTime,
    formatResponseTime,
    truncateText,
    createDebounce
  }
} 