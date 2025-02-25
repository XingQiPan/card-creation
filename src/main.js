import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import '@fortawesome/fontawesome-free/css/all.css'
import '@fortawesome/fontawesome-free/js/all.js'
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import './styles/common.css'
import router from './router'


// 创建应用实例
const app = createApp(App)

// 使用路由
app.use(router)

// 添加全局事件总线
app.config.globalProperties.$eventBus = {
  emit(event, ...args) {
    window.dispatchEvent(new CustomEvent(event, { detail: args }))
  },
  on(event, callback) {
    window.addEventListener(event, (e) => callback(...(e.detail || [])))
  },
  off(event, callback) {
    window.removeEventListener(event, callback)
  }
}

// 挂载应用
app.mount('#app')
