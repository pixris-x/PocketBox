// URL 编解码工具
const NOT_ENCODED = /[!'()*]/g // RFC3986 保留字符（encodeURIComponent 不转义）

/**
 * URL 组件编码
 * @param {string} str
 * @param {{encodeAll?: boolean}} [options] encodeAll=true 时连 !'()* 也转义
 * @returns {string}
 */
export function encodeComponent(str, { encodeAll = false } = {}) {
  let out = encodeURIComponent(str)
  if (encodeAll) {
    out = out.replace(NOT_ENCODED, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
  }
  return out
}

/**
 * URL 组件解码（兼容查询串中的 + 号；非法序列返回错误）
 * @param {string} str
 * @returns {{ok: boolean, value: string, error: string}}
 */
export function decodeComponent(str) {
  try {
    return { ok: true, value: decodeURIComponent(str.replace(/\+/g, ' ')), error: '' }
  } catch (err) {
    return { ok: false, value: '', error: '解码失败：存在非法的 % 转义序列' }
  }
}

/** 判断字符串是否可能已是编码态（含 % 序列） */
export function looksEncoded(str) {
  return /%[0-9A-Fa-f]{2}/.test(str)
}
