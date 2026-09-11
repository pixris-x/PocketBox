// ============================================================
// SHA 摘要工具（基于 Web Crypto，无第三方依赖）
// 注意：crypto.subtle 只在「安全上下文」可用（HTTPS 或 localhost）。
//       纯 HTTP 的局域网地址下会不可用，此时给出明确提示，不静默失败。
// ============================================================

/** 支持的算法（数组顺序即页面展示顺序） */
export const SHA_ALGORITHMS = [
  { id: 'SHA-256', label: 'SHA-256', note: '最常用的安全选择，兼容性好' },
  { id: 'SHA-512', label: 'SHA-512', note: '摘要更长，安全性更高' },
  { id: 'SHA-384', label: 'SHA-384', note: 'SHA-512 的截断版，常见于 TLS' },
  { id: 'SHA-1', label: 'SHA-1', note: '已被证明可碰撞，仅用于兼容旧系统' },
]

const DEFAULT_ALGORITHM = 'SHA-256'

/** 当前环境是否支持 Web Crypto 摘要计算（需 HTTPS 或 localhost） */
export function isWebCryptoAvailable() {
  return typeof globalThis.crypto?.subtle?.digest === 'function'
}

function ensureReady(algorithm) {
  if (!isWebCryptoAvailable()) {
    throw new Error('当前环境不支持 Web Crypto，SHA 计算需要以 HTTPS 或 localhost 访问')
  }
  if (!SHA_ALGORITHMS.some((item) => item.id === algorithm)) {
    throw new Error(`不支持的算法：${algorithm}`)
  }
}

/** ArrayBuffer → 小写十六进制 */
function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 文本 → SHA 摘要（按 UTF-8 编码，中文安全）
 * @param {string} text
 * @param {string} [algorithm] 见 SHA_ALGORITHMS 的 id
 * @returns {Promise<string>} 小写十六进制
 */
export async function shaText(text, algorithm = DEFAULT_ALGORITHM) {
  ensureReady(algorithm)
  const data = new TextEncoder().encode(String(text ?? ''))
  return toHex(await globalThis.crypto.subtle.digest(algorithm, data))
}

/**
 * ArrayBuffer → SHA 摘要
 * @param {ArrayBuffer} buffer
 * @param {string} [algorithm]
 * @returns {Promise<string>}
 */
export async function shaBuffer(buffer, algorithm = DEFAULT_ALGORITHM) {
  ensureReady(algorithm)
  return toHex(await globalThis.crypto.subtle.digest(algorithm, buffer))
}

/**
 * 文件 → SHA 摘要
 * @param {Blob} file
 * @param {string} [algorithm]
 * @returns {Promise<string>}
 */
export async function shaFile(file, algorithm = DEFAULT_ALGORITHM) {
  ensureReady(algorithm)
  return toHex(await globalThis.crypto.subtle.digest(algorithm, await file.arrayBuffer()))
}
