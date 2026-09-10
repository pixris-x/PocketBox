// ============================================================
// Service Worker 注册与更新检测
// 关键：public/sw.js 的 install 阶段是「无条件 skipWaiting()」、activate 阶段
// clients.claim()，所以新版本会立刻接管页面。这意味着 **不能** 用
// `registration.waiting` 判断有没有新版本 —— 在正常更新路径下它恒为 null。
// 可靠的信号是 navigator.serviceWorker 的 controllerchange 事件。
// ============================================================
import { ref } from 'vue'

/** 已有新版本接管页面，但当前页面仍在跑旧代码，需要刷新才能用上 */
export const updateReady = ref(false)

/** 注册 Service Worker 并监听更新（仅在调用方确认是生产环境后使用） */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  // 首次访问时页面本就没有 controller，此时的 controllerchange 是「首次接管」
  // 而不是「版本更新」，不能弹更新提示。此判断必须在注册之前取。
  const hadController = Boolean(navigator.serviceWorker.controller)

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 注册失败不影响正常使用（如 http 非 localhost 的非常安全上下文）
    })
  })

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return
    updateReady.value = true
  })
}
