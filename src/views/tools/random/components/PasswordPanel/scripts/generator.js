// ============================================================
// 随机强密码生成逻辑（密码页面专属脚本）
// 使用 Web Crypto（crypto.getRandomValues）保证密码学安全随机，
// 禁止使用 Math.random()
// ============================================================

export const CHARSET_KEYS = ['upper', 'lower', 'digits', 'symbols']

export const CHARSETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/',
}

export const CHARSET_LABELS = {
  upper: '大写字母 (A-Z)',
  lower: '小写字母 (a-z)',
  digits: '数字 (0-9)',
  symbols: '符号 (!@#$...)',
}

// 易混淆字符：0/O、1/l、I
const AMBIGUOUS = /[0O1lI]/g

/**
 * 根据勾选与排除项构建字符集
 * @param {{upper?:boolean, lower?:boolean, digits?:boolean, symbols?:boolean}} include
 * @param {{excludeAmbiguous?:boolean}} [options]
 * @returns {string}
 */
export function buildCharset(include, { excludeAmbiguous = false } = {}) {
  let charset = CHARSET_KEYS.filter((key) => include[key])
    .map((key) => CHARSETS[key])
    .join('')
  if (excludeAmbiguous) charset = charset.replace(AMBIGUOUS, '')
  return charset
}

/**
 * 无偏随机整数 [0, max)
 * 通过拒绝采样消除模偏差（modulo bias）
 */
function randomIndex(max) {
  const limit = Math.floor(0x100000000 / max) * max
  const buf = new Uint32Array(1)
  let value
  do {
    crypto.getRandomValues(buf)
    value = buf[0]
  } while (value >= limit)
  return value % max
}

/**
 * 生成一个密码
 * @param {number} length
 * @param {string} charset
 * @param {{atLeastOne?:boolean, include?:object}} [options] atLeastOne=true 时保证每类至少一个
 * @returns {string}
 */
export function generatePassword(length, charset, { atLeastOne = false, include = {} } = {}) {
  if (!charset) return ''
  const chars = []
  // 保证每类至少一个：从每类随机取一个
  if (atLeastOne) {
    const selected = CHARSET_KEYS.filter((key) => include[key] && CHARSETS[key])
    selected.forEach((key) => chars.push(CHARSETS[key][randomIndex(CHARSETS[key].length)]))
  }
  // 其余位置从全字符集随机取
  while (chars.length < length) {
    chars.push(charset[randomIndex(charset.length)])
  }
  // 洗牌，避免"每类至少一个"导致前 N 位固定类别
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

/**
 * 计算熵（比特）：length * log2(charsetSize)
 */
export function entropyBits(length, charsetSize) {
  if (!charsetSize) return 0
  return length * Math.log2(charsetSize)
}

/**
 * 按熵划分强度
 * @returns {{label:string, level:number}} level 0~3
 */
export function strengthOf(bits) {
  if (bits < 40) return { label: '弱', level: 0 }
  if (bits < 60) return { label: '一般', level: 1 }
  if (bits < 90) return { label: '强', level: 2 }
  return { label: '非常强', level: 3 }
}
