import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { version } from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8888,
    open: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  define: {
    '__APP_VERSION__': JSON.stringify(version)
  }
})
