// 全局轻量 toast 消息中心
// UiToast 组件消费 toastState 渲染；页面/工具通过 useToast() 触发反馈
import { reactive } from 'vue'

let seed = 0

export const toastState = reactive([])

/**
 * 弹出一条 toast 消息
 * @param {string} message 消息文本
 * @param {'success'|'error'|'info'|'warning'} [type] 类型
 * @param {number} [duration] 展示时长 ms
 */
export function toast(message, type = 'info', duration = 2200) {
  const id = ++seed
  toastState.push({ id, message, type })
  setTimeout(() => {
    const index = toastState.findIndex((item) => item.id === id)
    if (index > -1) toastState.splice(index, 1)
  }, duration)
}

/** 返回带便捷类型方法的 toast 对象 */
export function useToast() {
  return {
    toast,
    info: (message, duration) => toast(message, 'info', duration),
    success: (message, duration) => toast(message, 'success', duration),
    error: (message, duration) => toast(message, 'error', duration),
    warning: (message, duration) => toast(message, 'warning', duration),
  }
}
