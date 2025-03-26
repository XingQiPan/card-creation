import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import '@fortawesome/fontawesome-free/css/all.css'
import '@fortawesome/fontawesome-free/js/all.js'
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import './styles/common.css'
import router from './router'

document.title = `星卡写作 ${__APP_VERSION__}`

// 创建应用实例
const app = createApp(App)

// 使用路由
app.use(router)

// 挂载应用
app.mount('#app')
