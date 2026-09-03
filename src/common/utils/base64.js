// Base64 编解码（Unicode 安全）
// 文本走 UTF-8 编解码，避免 btoa/atob 对中文等字符抛错

const CHUNK_SIZE = 0x8000 // 分批转码，防止大文本调用栈溢出

/**
 * 文本 → Base64（UTF-8 安全）
 * @param {string} str
 * @returns {string}
 */
export function textToBase64(str) {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE))
  }
  return btoa(binary)
}

/**
 * Base64 → 文本（UTF-8 安全）
 * @param {string} b64
 * @returns {string}
 */
export function base64ToText(b64) {
  const binary = atob(cleanBase64(b64))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** 去除 data URL 前缀与空白，返回纯 base64 段 */
export function cleanBase64(b64) {
  const cleaned = String(b64).trim().replace(/\s+/g, '')
  const comma = cleaned.indexOf(',')
  return comma > -1 && cleaned.slice(0, comma).includes(';base64') ? cleaned.slice(comma + 1) : cleaned
}

/** 校验是否为合法 base64 字符串 */
export function isValidBase64(b64) {
  const cleaned = cleanBase64(b64)
  if (!cleaned) return false
  return /^[A-Za-z0-9+/]*={0,2}$/.test(cleaned) && cleaned.length % 4 === 0
}

/**
 * 文件 → data URL（含 base64）
 * @param {Blob} file
 * @returns {Promise<string>}
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

/** 文件 → 纯 base64 字符串 */
export async function fileToBase64(file) {
  const dataUrl = await fileToDataUrl(file)
  return cleanBase64(dataUrl)
}

/** 纯 base64 → Blob（支持传入 data URL 自动识别 MIME） */
export function base64ToBlob(b64, mime = 'application/octet-stream') {
  const cleaned = cleanBase64(b64)
  const binary = atob(cleaned)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: mime })
}

/** 从 data URL 中识别 MIME 类型 */
export function mimeFromDataUrl(dataUrl) {
  const match = /^data:([^;,]+)/.exec(dataUrl)
  return match ? match[1] : ''
}
