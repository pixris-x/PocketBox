// ============================================================
// 进制转换工具（BigInt 实现，2–36 任意精度整数）
// ============================================================

/** 进制选项（展示顺序即页面顺序） */
export const BASE_PRESETS = [
  { value: 2, label: '二进制 (2)' },
  { value: 8, label: '八进制 (8)' },
  { value: 10, label: '十进制 (10)' },
  { value: 16, label: '十六进制 (16)' },
]

const PREFIX_BY_BASE = {
  2: /^0b/i,
  8: /^0o/i,
  16: /^0x/i,
}

/** 校验进制参数 */
function ensureValidBase(base) {
  if (!Number.isInteger(base) || base < 2 || base > 36) {
    throw new Error('进制必须在 2 到 36 之间')
  }
}

/** 单个字符 → 数值（0-9 / a-z，不区分大小写） */
function digitValue(ch) {
  const code = ch.charCodeAt(0)
  if (code >= 0x30 && code <= 0x39) return code - 0x30 // 0-9
  if (code >= 0x61 && code <= 0x7a) return code - 0x61 + 10 // a-z
  if (code >= 0x41 && code <= 0x5a) return code - 0x41 + 10 // A-Z
  return -1
}

/**
 * 解析 N 进制字符串为 BigInt
 * · 自动去除首尾空白
 * · 接受可选正负号
 * · 与进制一致时自动剥离 0x/0b/0o 前缀
 * · 字符与进制不匹配时抛出可读错误
 * @param {string} input
 * @param {number} base 2-36
 * @returns {bigint}
 */
export function parseInBase(input, base) {
  ensureValidBase(base)
  let text = String(input ?? '').trim()
  if (!text) throw new Error('输入不能为空')

  let sign = 1n
  if (text[0] === '+' || text[0] === '-') {
    if (text[0] === '-') sign = -1n
    text = text.slice(1)
    if (!text) throw new Error('正负号后必须有数字')
  }

  const prefixRe = PREFIX_BY_BASE[base]
  if (prefixRe) text = text.replace(prefixRe, '')

  if (!text) throw new Error('输入不能为空（只有正负号或前缀）')

  // 严格校验：除下划线外每字符必须属于该进制
  const cleaned = text.replace(/_/g, '') // 容许 1_000_000 这类视觉分隔
  if (!cleaned) throw new Error('输入不能为空')

  let value = 0n
  const baseBig = BigInt(base)
  for (const ch of cleaned) {
    const d = digitValue(ch)
    if (d < 0 || d >= base) {
      throw new Error(`字符「${ch}」不属于 ${base} 进制（合法字符 0–${base - 1}）`)
    }
    value = value * baseBig + BigInt(d)
  }
  return sign * value
}

/**
 * BigInt → N 进制字符串（小写）
 * 0 直接返回 '0'，与 BigInt.toString 行为一致
 * @param {bigint} value
 * @param {number} base 2-36
 * @returns {string}
 */
export function formatInBase(value, base) {
  ensureValidBase(base)
  return BigInt(value).toString(base)
}

/**
 * 在任意两个进制之间互转
 * · 错误信息可直接展示给用户
 * · 跨进制往返（如 2↔16）保证不丢精度
 * @param {string} input
 * @param {number} fromBase 2-36
 * @param {number} toBase 2-36
 * @returns {string} 小写字符串
 */
export function convertBase(input, fromBase, toBase) {
  return formatInBase(parseInBase(input, fromBase), toBase)
}

/** 一次性给出 2/8/10/16 四个结果，常用于页面展示 */
export function convertToAllCommon(input, fromBase) {
  const value = parseInBase(input, fromBase)
  return {
    2: value.toString(2),
    8: value.toString(8),
    10: value.toString(10),
    16: value.toString(16),
  }
}
