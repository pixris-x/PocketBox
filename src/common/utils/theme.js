// 明暗主题 + 配色管理：localStorage 记忆 + 跟随系统偏好
// 两个正交维度：html[data-theme] 控制明暗，html[data-accent] 控制配色
// 样式 token 见 common/styles/_base.scss
import { computed, reactive } from 'vue'

const STORAGE_KEY_THEME = 'wt-theme'
const STORAGE_KEY_ACCENT = 'wt-accent'
const SYSTEM_DARK = '(prefers-color-scheme: dark)'
const DEFAULT_ACCENT = 'orange'

/** 可选配色（value 即 data-accent 取值） */
export const ACCENTS = [
  { value: 'orange', label: '橙灰' },
  { value: 'blue', label: '经典蓝' },
  { value: 'teal', label: '青绿' },
]

const ACCENT_VALUES = ACCENTS.map((item) => item.value)

export const themeState = reactive({
  theme: 'light', // 'light' | 'dark'
  accent: DEFAULT_ACCENT, // 见 ACCENTS
})

function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia(SYSTEM_DARK).matches ? 'dark' : 'light'
  }
  return 'light'
}

/** 切换时临时挂 .theming 触发平滑过渡 */
function withTransition(apply) {
  const root = document.documentElement
  root.classList.add('theming')
  apply()
  window.setTimeout(() => root.classList.remove('theming'), 260)
}

/** 初始化主题（main.js 调用一次） */
export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY_THEME)
  const theme = saved === 'light' || saved === 'dark' ? saved : getSystemTheme()
  const savedAccent = localStorage.getItem(STORAGE_KEY_ACCENT)
  const accent = ACCENT_VALUES.includes(savedAccent) ? savedAccent : DEFAULT_ACCENT

  themeState.theme = theme
  themeState.accent = accent
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.setAttribute('data-accent', accent)

  // 未手动选择时跟随系统变化
  if (!saved && window.matchMedia) {
    window.matchMedia(SYSTEM_DARK).addEventListener('change', (e) => {
      const next = e.matches ? 'dark' : 'light'
      themeState.theme = next
      withTransition(() => document.documentElement.setAttribute('data-theme', next))
    })
  }
}

/** 切换明暗（写 localStorage） */
export function toggleTheme() {
  const next = themeState.theme === 'dark' ? 'light' : 'dark'
  themeState.theme = next
  localStorage.setItem(STORAGE_KEY_THEME, next)
  withTransition(() => document.documentElement.setAttribute('data-theme', next))
}

/** 切换配色（写 localStorage） */
export function setAccent(accent) {
  if (!ACCENT_VALUES.includes(accent)) return
  themeState.accent = accent
  localStorage.setItem(STORAGE_KEY_ACCENT, accent)
  withTransition(() => document.documentElement.setAttribute('data-accent', accent))
}

/** 组合式 API：返回响应式主题状态与切换方法 */
export function useTheme() {
  return {
    theme: computed(() => themeState.theme),
    isDark: computed(() => themeState.theme === 'dark'),
    toggle: toggleTheme,
    accent: computed(() => themeState.accent),
    setAccent,
    accents: ACCENTS,
  }
}
