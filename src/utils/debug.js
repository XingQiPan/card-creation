let isDebugMode = false; // 默认关闭调试模式

// 设置调试模式
export const setDebugMode = (mode) => {
  isDebugMode = mode;
}

// 调试输出函数
export const debugLog = (...args) => {
  if (isDebugMode) {
    console.log(...args);
  }
} 