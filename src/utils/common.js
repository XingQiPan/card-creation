// Toast提示
export const showToast = (message, type = 'success') => {
    // 先移除可能存在的旧提示框
    const existingToast = document.querySelector('.toast-notification')
    if (existingToast) {
      document.body.removeChild(existingToast)
    }
  
    // 创建提示框容器
    const toastContainer = document.createElement('div')
    toastContainer.className = 'toast-notification'
    toastContainer.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%) translateY(-100%);
      background: white;
      border-radius: 4px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      opacity: 0;
      transition: all 0.3s ease;
      min-width: 200px;
      justify-content: center;
      border-left: 4px solid ${type === 'success' ? '#10b981' : '#ef4444'};
    `
  
    // 创建图标
    const icon = document.createElement('i')
    icon.className = type === 'success' ? 'fas fa-check' : 'fas fa-exclamation-circle'
    icon.style.color = type === 'success' ? '#10b981' : '#ef4444'
  
    // 创建文本
    const text = document.createElement('span')
    text.textContent = message
    text.style.fontSize = '14px'
  
    // 组装提示框
    toastContainer.appendChild(icon)
    toastContainer.appendChild(text)
    document.body.appendChild(toastContainer)
  
    // 显示动画
    requestAnimationFrame(() => {
      toastContainer.style.transform = 'translateX(-50%) translateY(0)'
      toastContainer.style.opacity = '1'
    })
  
    // 2秒后消失
    setTimeout(() => {
      toastContainer.style.transform = 'translateX(-50%) translateY(-100%)'
      toastContainer.style.opacity = '0'
      
      // 动画结束后移除元素
      setTimeout(() => {
        if (toastContainer.parentNode) {
          document.body.removeChild(toastContainer)
        }
      }, 300)
    }, 2000)
  }

// API请求处理
export const apiUtils = {
  handleResponse: async (response) => {
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || `请求失败: ${response.status}`)
    }
    return response.json()
  },

  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
}

// Toast提示函数
export const showToastMessage = (message, type = 'success') => {
  const toast = document.createElement('div')
  toast.className = `toast-message ${type}`
  toast.textContent = message
  
  // 添加样式
  toast.style.position = 'fixed'
  toast.style.bottom = '20px'
  toast.style.right = '20px'
  toast.style.padding = '10px 20px'
  toast.style.borderRadius = '4px'
  toast.style.backgroundColor = type === 'success' ? '#4caf50' : '#f44336'
  toast.style.color = 'white'
  toast.style.zIndex = '9999'
  toast.style.transition = 'opacity 0.3s'
  
  document.body.appendChild(toast)
  
  // 3秒后自动消失
  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => {
      document.body.removeChild(toast)
    }, 300)
  }, 3000)
}

// 格式化时间
export const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString()
}

// 文本截断
export const truncateText = (text, maxLength = 100) => {
  if (!text) return ''
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

// 防抖函数
export const debounce = (fn, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// 检测内容类型
export const detectContentType = (content) => {
  if (!content) return 'text'
  
  // 检测代码块
  if (content.trim().startsWith('```')) return 'code'
  
  // 检测列表 (无序列表和有序列表)
  if (/^[-*+]\s|^\d+\.\s/.test(content)) return 'list'
  
  // 检测标题
  if (/^#{1,6}\s/.test(content)) return 'heading'
  
  // 检测是否是JSON
  try {
    JSON.parse(content)
    return 'json'
  } catch (e) {
    // 不是JSON
  }
  
  // 检测是否包含其他Markdown语法
  if (content.match(/[*#\[\]_`]/) || content.includes('http')) return 'markdown'
  
  return 'text'
}

// 添加一个新的拆分函数
export const splitContent = (content) => {
  if (!content) return []
  
  const sections = []
  let currentSection = {
    content: [],
    type: 'text'
  }
  
  const lines = content.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const nextLine = lines[i + 1]
    
    // 检测新section的开始
    if (line.trim().startsWith('```') || // 代码块
        /^#{1,6}\s/.test(line) || // 标题
        /^[-*+]\s|^\d+\.\s/.test(line) || // 列表
        (currentSection.content.length > 0 && line.trim() === '')) { // 空行分隔
      
      // 保存当前section(如果有内容)
      if (currentSection.content.length > 0) {
        currentSection.content = currentSection.content.join('\n')
        currentSection.type = detectContentType(currentSection.content)
        sections.push({ ...currentSection })
        currentSection = { content: [], type: 'text' }
      }
    }
    
    // 添加当前行到section
    currentSection.content.push(line)
    
    // 如果是最后一行，保存最后的section
    if (i === lines.length - 1) {
      currentSection.content = currentSection.content.join('\n')
      currentSection.type = detectContentType(currentSection.content)
      sections.push({ ...currentSection })
    }
  }
  
  // 处理每个section，添加标题
  return sections.map((section, index) => ({
    title: `片段 ${index + 1} (${section.type})`,
    content: section.content.trim(),
    type: section.type,
    selected: false
  }))
}

// 导出所有工具函数
export default {
  showToastMessage,
  formatTime,
  truncateText,
  debounce,
  detectContentType,
  splitContent
} 