/**
 * 简单的 Toast 通知工具
 */

let toastContainer = null;

// 创建 Toast 容器
const createToastContainer = () => {
  if (toastContainer) return toastContainer;
  
  toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  toastContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
  `;
  
  document.body.appendChild(toastContainer);
  return toastContainer;
};

// 显示 Toast 通知
const showToast = (message, type = 'info', duration = 3000) => {
  const container = createToastContainer();
  
  // 创建 Toast 元素
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.cssText = `
    padding: 12px 16px;
    border-radius: 4px;
    color: white;
    font-size: 14px;
    max-width: 300px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    display: flex;
    align-items: center;
    gap: 8px;
    animation: toast-in 0.3s ease-out forwards;
  `;
  
  // 设置背景颜色
  switch (type) {
    case 'success':
      toast.style.backgroundColor = '#10b981';
      break;
    case 'error':
      toast.style.backgroundColor = '#ef4444';
      break;
    case 'warning':
      toast.style.backgroundColor = '#f59e0b';
      break;
    default:
      toast.style.backgroundColor = '#3b82f6';
  }
  
  // 添加图标
  const icon = document.createElement('i');
  icon.className = 'fas';
  switch (type) {
    case 'success':
      icon.className += ' fa-check-circle';
      break;
    case 'error':
      icon.className += ' fa-exclamation-circle';
      break;
    case 'warning':
      icon.className += ' fa-exclamation-triangle';
      break;
    default:
      icon.className += ' fa-info-circle';
  }
  
  // 添加消息
  const messageElement = document.createElement('span');
  messageElement.textContent = message;
  
  // 组装 Toast
  toast.appendChild(icon);
  toast.appendChild(messageElement);
  container.appendChild(toast);
  
  // 添加 CSS 动画
  const style = document.createElement('style');
  style.textContent = `
    @keyframes toast-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes toast-out {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  
  // 设置自动消失
  setTimeout(() => {
    toast.style.animation = 'toast-out 0.3s ease-in forwards';
    setTimeout(() => {
      container.removeChild(toast);
      
      // 如果没有更多 Toast，移除容器
      if (container.childNodes.length === 0) {
        document.body.removeChild(container);
        toastContainer = null;
      }
    }, 300);
  }, duration);
  
  return toast;
};

export { showToast }; 