// ============================================================
// 校验和与校验位
//   - CRC-32（zlib / ISO-3309 反射式，多项式 0x04C11DB7 → 反射 0xEDB88320）
//   - Adler-32（zlib 同款，MOD 65521）
//   - Luhn（银行卡 / IMEI 那类「加倍求和」校验位）
//   - ISBN-10 / ISBN-13 校验位
// 全部为纯函数，输入接受字符串（按 UTF-8 转字节）或 Uint8Array。
// 测试向量已与 Python zlib.crc32 / zlib.adler32 逐条核对。
// ============================================================

const CRC32_POLY = 0xedb88320
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? CRC32_POLY ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

const ADLER_MOD = 65521

/** 字符串按 UTF-8 转字节，字节输入原样返回 */
function toBytes(input) {
  if (input instanceof Uint8Array) return input
  if (Array.isArray(input)) return Uint8Array.from(input)
  return new TextEncoder().encode(String(input ?? ''))
}

/**
 * CRC-32 校验和
 * @param {string|Uint8Array|number[]} input
 * @returns {number} 无符号 32 位整数
 */
export function crc32(input) {
  const bytes = toBytes(input)
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Adler-32 校验和
 * @param {string|Uint8Array|number[]} input
 * @returns {number} 无符号 32 位整数
 */
export function adler32(input) {
  const bytes = toBytes(input)
  let a = 1
  let b = 0
  for (const byte of bytes) {
    a = (a + byte) % ADLER_MOD
    b = (b + a) % ADLER_MOD
  }
  return ((b << 16) | a) >>> 0
}

/**
 * 数值转定长十六进制字符串
 * @param {number} value
 * @param {{digits?: number, upper?: boolean}} [options]
 * @returns {string}
 */
export function toHex(value, { digits = 8, upper = true } = {}) {
  const text = (value >>> 0).toString(16).padStart(digits, '0')
  return upper ? text.toUpperCase() : text
}

/** 提取数字串：允许空格与连字符分隔，出现其他非数字字符则抛错 */
function digitsOf(input, label = '号码') {
  const cleaned = String(input ?? '').replace(/[\s-]/g, '')
  if (!cleaned) throw new Error(`${label}为空`)
  if (!/^[0-9]+$/.test(cleaned)) throw new Error(`${label}含非数字字符`)
  return cleaned
}

/**
 * Luhn 校验位：给定不含校验位的主干，算出应附加的一位
 *
 * 这里遍历 0~9 找能让整串通过校验的那一位，而不是自己再算一遍加倍奇偶性 ——
 * 加倍的起点取决于「拼上校验位后总长」的奇偶，两处各写一套极易算反
 * （本函数先前就把奇偶写反，给出了 7992739877 → 8 而不是正确的 0）。
 * 只有 10 种候选，代价可忽略，且校验逻辑只有一处。
 * @param {string} payload 数字串
 * @returns {number} 0~9
 */
export function luhnCheckDigit(payload) {
  const digits = digitsOf(payload, '账号')
  for (let d = 0; d <= 9; d++) {
    if (luhnValid(digits + d)) return d
  }
  return 0 // luhnValid 对 10 个候选必有一个成立，此处不可达
}

/**
 * Luhn 校验：输入含校验位的完整号码
 * @param {string} full
 * @returns {boolean}
 */
export function luhnValid(full) {
  const digits = digitsOf(full, '号码').split('').map(Number)
  if (digits.length < 2) return false
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = digits[i]
    // 从右数第 2 位起交替加倍
    if ((digits.length - i) % 2 === 0) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

/**
 * ISBN-10 校验位
 * @param {string} nine 前 9 位数字
 * @returns {string} '0'~'9' 或 'X'（代表 10）
 */
export function isbn10CheckDigit(nine) {
  const digits = digitsOf(nine, 'ISBN 前缀')
  if (digits.length !== 9) throw new Error('ISBN-10 需要恰好 9 位前缀')
  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i)
  const remainder = (11 - (sum % 11)) % 11
  return remainder === 10 ? 'X' : String(remainder)
}

/**
 * 校验 ISBN-10（权重 10..1 求和模 11，末位允许 X）
 * @param {string} isbn
 * @returns {boolean}
 */
export function isbn10Valid(isbn) {
  const cleaned = String(isbn ?? '')
    .replace(/[\s-]/g, '')
    .toUpperCase()
  if (!/^[0-9]{9}[0-9X]$/.test(cleaned)) return false
  let sum = 0
  for (let i = 0; i < 10; i++) {
    const ch = cleaned[i]
    const d = ch === 'X' ? 10 : Number(ch)
    sum += d * (10 - i)
  }
  return sum % 11 === 0
}

/**
 * ISBN-13 校验位
 * @param {string} twelve 前 12 位数字
 * @returns {number} 0~9
 */
export function isbn13CheckDigit(twelve) {
  const digits = digitsOf(twelve, 'ISBN 前缀')
  if (digits.length !== 12) throw new Error('ISBN-13 需要恰好 12 位前缀')
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3)
  return (10 - (sum % 10)) % 10
}

/**
 * 校验 ISBN-13（权重 1,3 交替求和模 10）
 * @param {string} isbn
 * @returns {boolean}
 */
export function isbn13Valid(isbn) {
  const cleaned = digitsOf(isbn, 'ISBN')
  if (cleaned.length !== 13) return false
  return Number(cleaned[12]) === isbn13CheckDigit(cleaned.slice(0, 12))
}

/**
 * 按长度与格式识别 ISBN 类型
 * @param {string} isbn
 * @returns {'isbn10'|'isbn13'|null}
 */
export function detectIsbn(isbn) {
  const cleaned = String(isbn ?? '')
    .replace(/[\s-]/g, '')
    .toUpperCase()
  if (/^[0-9]{9}[0-9X]$/.test(cleaned)) return 'isbn10'
  if (/^[0-9]{13}$/.test(cleaned)) return 'isbn13'
  return null
}

/**
 * 校验 ISBN，自动按位数选择算法
 * @param {string} isbn
 * @returns {boolean}
 */
export function isbnValid(isbn) {
  const kind = detectIsbn(isbn)
  if (kind === 'isbn10') return isbn10Valid(isbn)
  if (kind === 'isbn13') return isbn13Valid(isbn)
  return false
}
