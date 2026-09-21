// ============================================================
// 短码 / NanoID 风格标识生成
//   - 随机源：Web Crypto 的 getRandomValues
//   - 字节 → 字符走「拒绝采样」：直接 byte % 字母表长度在非 2 次幂长度上分布不均
//     （例如 10 字符字母表下 0~5 比 6~9 更容易出现），故先按 256 % len 划掉尾部字节
//   - pickFromBytes / groupBy 是纯函数，随机与格式化分开，便于单测
// ============================================================

// NanoID 默认字母表：A-Za-z0-9 加 - 与 _，共 64 个且已打乱（相邻字符不连续）
export const ALPHABETS = {
  standard: 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict',
  alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  lower: 'abcdefghijklmnopqrstuvwxyz0123456789',
  hex: '0123456789abcdef',
  digits: '0123456789',
}

export const ALPHABET_OPTIONS = [
  { label: 'NanoID 默认（字母数字与 -_）', value: 'standard' },
  { label: '字母 + 数字（无 -_，适合做密码片段）', value: 'alnum' },
  { label: '仅小写字母 + 数字', value: 'lower' },
  { label: '十六进制', value: 'hex' },
  { label: '仅数字（PIN / 验证码）', value: 'digits' },
]

/**
 * 字母表大小（供 UI 估算信息量，避免各处再抄一份长度常量）
 * @param {string} key
 * @returns {number} 未知键名返回 0
 */
export function alphabetSize(key) {
  const alphabet = ALPHABETS[key]
  return alphabet ? alphabet.length : 0
}

/**
 * 从给定字节中按拒绝采样取出 count 个字符
 * @param {Uint8Array} bytes
 * @param {string} alphabet
 * @param {number} count
 * @returns {{chars: string, used: number}} used 为消费掉的字节数（含被拒绝的）
 */
export function pickFromBytes(bytes, alphabet, count) {
  if (count <= 0) return { chars: '', used: 0 }
  const limit = 256 - (256 % alphabet.length)
  let chars = ''
  let used = 0
  for (const byte of bytes) {
    used++
    if (byte < limit) chars += alphabet[byte % alphabet.length]
    if (chars.length === count) break
  }
  return { chars, used }
}

/**
 * 按固定长度分组并以分隔符连接（方便口述与肉眼核对）
 * @param {string} id
 * @param {number} size 每组字符数，小于 1 时原样返回
 * @param {string} [separator]
 * @returns {string}
 */
export function groupBy(id, size, separator = '-') {
  if (!size || size < 1 || size >= id.length) return id
  const parts = []
  for (let i = 0; i < id.length; i += size) parts.push(id.slice(i, i + size))
  return parts.join(separator)
}

/**
 * 生成一个短码
 * @param {{size?: number, alphabetKey?: string, groupSize?: number, separator?: string}} [options]
 * @returns {string}
 * @throws {Error} 字母表键名未知，或 size 非法
 */
export function generateId({
  size = 21,
  alphabetKey = 'standard',
  groupSize = 0,
  separator = '-',
} = {}) {
  const alphabet = ALPHABETS[alphabetKey]
  if (!alphabet) throw new Error(`未知字母表：${alphabetKey}`)
  if (!Number.isInteger(size) || size < 1 || size > 2048) {
    throw new Error('长度必须是 1~2048 的整数')
  }

  let chars = ''
  while (chars.length < size) {
    // 拒绝采样会吃掉少量字节，按缺口多取一些，正常情况下一次就能填满
    const need = size - chars.length
    const bytes = crypto.getRandomValues(new Uint8Array(need * 2 + 8))
    chars += pickFromBytes(bytes, alphabet, need).chars
  }
  return groupBy(chars, groupSize, separator)
}

/**
 * 批量生成
 * @param {number} count
 * @param {Parameters<typeof generateId>[0]} [options]
 * @returns {string[]}
 */
export function generateIds(count, options) {
  const list = []
  for (let i = 0; i < count; i++) list.push(generateId(options))
  return list
}
