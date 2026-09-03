import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { UiLibrary } from './common/components'
import { initTheme } from './common/utils/theme'
import './common/styles/index.scss'

initTheme()

createApp(App).use(router).use(UiLibrary).mount('#app')
