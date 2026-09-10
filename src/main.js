import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { UiLibrary } from './common/components'
import { initTheme } from './common/utils/theme'
import { registerServiceWorker } from './common/utils/sw'
import './common/styles/index.scss'

initTheme()

createApp(App).use(router).use(UiLibrary).mount('#app')

// 注册 Service Worker：仅生产构建（开发模式会干扰 HMR 与热更新）
if (import.meta.env.PROD) {
  registerServiceWorker()
}
