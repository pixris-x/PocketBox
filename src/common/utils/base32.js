// ============================================================
// Base32 编解码（RFC 4648 标准字母表 A-Z 与 2-7）
//   - 解码容忍空格、连字符、小写与省略 padding —— 身份验证器里导出的密钥
//     常写成 XXXX XXXX-XXXX 分组形式，必须能直接粘进来用
//   - 本模块是 Base32 的唯一实现，totp.js 从这里 import（§2.1：禁止各写一份）
//   - base32hex（0-9A-V）不在本模块范围内，当前没有使用方
// ============================================================

export const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * 清洗输入：转大写、去掉空白与连字符、去掉末尾填充
 * @param {string} input
 * @returns {string}
 */
export function cleanBase32(input) {
  return String(input ?? '')
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/=+$/, '')
}

/**
 * Base32 → 字节
 * @param {string} input
 * @returns {Uint8Array}
 * @throws {Error} 内容为空或含非法字符
 */
export function base32Decode(input) {
  const clean = cleanBase32(input)
  if (!clean) throw new Error('Base32 内容为空')

  let bits = 0
  let value = 0
  const bytes = []
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) {
      throw new Error(`含非法字符「${char}」：Base32 只允许 A-Z 与 2-7`)
    }
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(bytes)
}

/**
 * 字节 → Base32
 * @param {Uint8Array|number[]} bytes
 * @param {{padding?: boolean}} [options] padding 为 true 时按 RFC 4648 补 = 到 8 的倍数
 * @returns {string}
 */
export function bytesToBase32(bytes, { padding = true } = {}) {
  const input = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes)
  let bits = 0
  let value = 0
  let out = ''

  for (const byte of input) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  // 最后一组不足 5 位时右侧补 0 比特
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31]

  if (padding) {
    const remainder = out.length % 8
    if (remainder) out += '='.repeat(8 - remainder)
  }
  return out
}

/** 文本（UTF-8）→ Base32 */
export function textToBase32(str, options) {
  return bytesToBase32(new TextEncoder().encode(String(str ?? '')), options)
}

/** Base32 → 文本（UTF-8） */
export function base32ToText(input) {
  return new TextDecoder().decode(base32Decode(input))
}

/**
 * 是否为结构合法的 Base32 串（与 base32Decode 的容忍度一致，不要求带 padding）
 *
 * n 字节编出的字符数 = floor(8n/5) + (8n%5 ? 1 : 0)，逐个代入得
 * 余数只可能是 0,2,4,5,7（对应块内 5,1,2,3,4 字节）；
 * 余数 1 / 3 / 6（长度 1,3,6,9,11,14,…）不可能由任何整数字节序列编出，判为非法。
 * @param {string} input
 * @returns {boolean}
 */
export function isValidBase32(input) {
  const clean = cleanBase32(input)
  if (!clean) return false
  if (!/^[A-Z2-7]+$/.test(clean)) return false
  return VALID_LENGTH_RESIDUES.has(clean.length % 8)
}

const VALID_LENGTH_RESIDUES = new Set([0, 2, 4, 5, 7])
