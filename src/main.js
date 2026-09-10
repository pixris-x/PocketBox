import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { UiLibrary } from './common/components'
import { initTheme } from './common/utils/theme'
import './common/styles/index.scss'

initTheme()

createApp(App).use(router).use(UiLibrary).mount('#app')

// 注册 Service Worker：仅生产构建（开发模式会干扰 HMR 与热更新）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 注册失败不影响正常使用（如 http 非 localhost 环境）
    })
  })
}
