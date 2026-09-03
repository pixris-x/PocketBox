// 明暗主题管理：localStorage 记忆 + 跟随系统偏好
// 通过 html[data-theme] 切换，样式 token 见 common/styles/_base.scss
import { computed, reactive } from 'vue'

const STORAGE_KEY = 'wt-theme'
const SYSTEM_DARK = '(prefers-color-scheme: dark)'

export const themeState = reactive({
  theme: 'light', // 'light' | 'dark'
})

function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia(SYSTEM_DARK).matches ? 'dark' : 'light'
  }
  return 'light'
}

function applyTheme(theme) {
  const root = document.documentElement
  // 临时挂 .theming 触发平滑过渡
  root.classList.add('theming')
  root.setAttribute('data-theme', theme)
  window.setTimeout(() => root.classList.remove('theming'), 260)
}

/** 初始化主题（main.js 调用一次） */
export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY)
  const theme = saved === 'light' || saved === 'dark' ? saved : getSystemTheme()
  themeState.theme = theme
  document.documentElement.setAttribute('data-theme', theme)

  // 未手动选择时跟随系统变化
  if (!saved && window.matchMedia) {
    window.matchMedia(SYSTEM_DARK).addEventListener('change', (e) => {
      const next = e.matches ? 'dark' : 'light'
      themeState.theme = next
      applyTheme(next)
    })
  }
}

/** 切换主题（写 localStorage） */
export function toggleTheme() {
  const next = themeState.theme === 'dark' ? 'light' : 'dark'
  themeState.theme = next
  localStorage.setItem(STORAGE_KEY, next)
  applyTheme(next)
}

/** 组合式 API：返回响应式主题与切换方法 */
export function useTheme() {
  return {
    theme: computed(() => themeState.theme),
    isDark: computed(() => themeState.theme === 'dark'),
    toggle: toggleTheme,
  }
}
