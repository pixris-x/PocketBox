// 剪贴板工具：优先 Clipboard API，降级 execCommand（兼容 file:// 等非安全上下文）
import { useToast } from './toast'

/**
 * 复制文本到剪贴板
 * @param {string} text
 * @param {{successMsg?: string}} [options]
 * @returns {Promise<boolean>}
 */
export async function copyText(text, { successMsg = '已复制到剪贴板' } = {}) {
  const { success, error } = useToast()
  if (!text) {
    error('没有可复制的内容')
    return false
  }
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      await legacyCopy(text)
    }
    success(successMsg)
    return true
  } catch (err) {
    console.error('[copy] failed:', err)
    error('复制失败')
    return false
  }
}

function legacyCopy(text) {
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      resolve(true)
    } catch (err) {
      reject(err)
    } finally {
      document.body.removeChild(textarea)
    }
  })
}
