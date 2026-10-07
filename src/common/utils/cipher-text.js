// ============================================================
// 文本密码与编码（无副作用、无 DOM 依赖）
//   - ROT13 / 凯撒移位：字母表整体平移，保留大小写与非字母字符
//   - 摩斯电码：字母、数字与常用标点
//   - Base58：比特币生态常用，剔除了 0 O I l 四个易混字符
// 全部纯函数，零依赖。
// ============================================================

// ============================================================
// 一、ROT13 / 凯撒移位
// ============================================================

const A_UPPER = 65
const A_LOWER = 97
const LETTER_COUNT = 26

/**
 * 凯撒移位
 *
 * 只移动 ASCII 字母，数字、标点、空格原样保留 —— 这是与「整串按码位加减」
 * 的关键区别，后者会把中文和标点一起挪位变成乱码。
 * @param {string} input
 * @param {number} shift 位移量，26 的倍数等价于不位移
 * @returns {string}
 */
export function caesarShift(input, shift) {
  const text = String(input ?? '')
  const offset = Number(shift) || 0
  if (!offset) return text
  // 先归一到 0~25，支持负数位移（往回推）
  const normalized = ((offset % LETTER_COUNT) + LETTER_COUNT) % LETTER_COUNT

  let out = ''
  for (const char of text) {
    const code = char.charCodeAt(0)
    if (code >= A_UPPER && code < A_UPPER + LETTER_COUNT) {
      out += String.fromCharCode(((code - A_UPPER + normalized) % LETTER_COUNT) + A_UPPER)
    } else if (code >= A_LOWER && code < A_LOWER + LETTER_COUNT) {
      out += String.fromCharCode(((code - A_LOWER + normalized) % LETTER_COUNT) + A_LOWER)
    } else {
      out += char
    }
  }
  return out
}

/** ROT13 就是位移 13 的凯撒 —— 它自反（转两次回到原文） */
export function rot13(input) {
  return caesarShift(input, 13)
}

/** 判断是否为可解的英文（用于提示 ROT13 的可读性） */
export function rot13LooksReadable(input) {
  const text = String(input ?? '')
  if (!text) return false
  const common = (text.match(/[EeAaTtOoIiNn]/g) || []).length
  const letters = (text.match(/[A-Za-z]/g) || []).length
  if (!letters) return false
  return common / letters > 0.2
}

// ============================================================
// 二、摩斯电码
// ============================================================

/** 字母表 */
const MORSE_LETTERS = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
}
/** 数字 */
const MORSE_DIGITS = {
  0: '-----',
  1: '.----',
  2: '..---',
  3: '...--',
  4: '....-',
  5: '.....',
  6: '-....',
  7: '--...',
  8: '---..',
  9: '----.',
}
/** 常用标点 */
const MORSE_PUNCTUATION = {
  '.': '.-.-.-',
  ',': '--..--',
  '?': '..--..',
  '!': '-.-.--',
  '/': '-..-.',
  '@': '.--.-.',
  '-': '-....-',
  ':': '---...',
  ';': '-.-.-.',
  '=': '-...-',
  '+': '.-.-.',
  "'": '.----.',
  '(': '-.--.',
  ')': '-.--.-',
  '&': '.-...',
  '"': '.-..-.',
  $: '...-..-',
}
// 字母倒查表（解码用）
const MORSE_TO_LETTER = Object.entries({ ...MORSE_LETTERS, ...MORSE_PUNCTUATION }).reduce(
  (acc, [char, code]) => {
    acc[code] = char
    return acc
  },
  {}
)
const MORSE_TO_DIGIT = Object.entries(MORSE_DIGITS).reduce((acc, [char, code]) => {
  acc[code] = char
  return acc
}, {})

/** 词内符号间隔、词间字母间隔、句子间单词间隔 */
export const MORSE_GAPS = { symbol: ' ', letter: ' / ', word: '  ' }

/**
 * 文本转摩斯电码
 * @param {string} input
 * @param {object} [options]
 * @param {string} [options.letterGap=' / '] 字母间分隔
 * @param {string} [options.wordGap='  '] 单词间分隔
 * @returns {string} 无法编码的字符会被替换成 '?'，不静默丢弃
 */
export function textToMorse(
  input,
  { letterGap = MORSE_GAPS.letter, wordGap = MORSE_GAPS.word } = {}
) {
  const text = String(input ?? '').toUpperCase()

  const words = text.split(/\s+/).filter(Boolean)
  const encoded = words.map((word) =>
    [...word]
      .map((char) => {
        if (char in MORSE_LETTERS) return MORSE_LETTERS[char]
        if (char in MORSE_DIGITS) return MORSE_DIGITS[char]
        if (char in MORSE_PUNCTUATION) return MORSE_PUNCTUATION[char]
        return '?'
      })
      .join(letterGap)
  )
  return encoded.join(wordGap)
}

/**
 * 摩斯电码转文本
 * @param {string} input 支持 ` / ` 字母分隔与双空格单词分隔，也容忍 `/`
 * @returns {string}
 */
export function morseToText(input) {
  const text = String(input ?? '').trim()
  if (!text) return ''

  // 词与词用 2+ 空格分；词内字母用 / 或空格分
  const words = text.split(/ {2,}/).filter((word) => word.trim())
  return words
    .map((word) =>
      word
        .trim()
        .split(/\s*\/\s*|\s+/)
        .filter(Boolean)
        .map((code) => {
          if (code in MORSE_TO_DIGIT) return MORSE_TO_DIGIT[code]
          if (code in MORSE_TO_LETTER) return MORSE_TO_LETTER[code]
          return '?'
        })
        .join('')
    )
    .join(' ')
}

// ============================================================
// 三、Base58
// ============================================================

/** Bitcoin alphabet：剔除了 0 O I l 四个易混字符 */
export const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const BASE58_INDEX = new Map([...BASE58_ALPHABET].map((char, index) => [char, index]))

/** 字符 → 字节 */
function toBytes(input) {
  if (input instanceof Uint8Array) return input
  if (Array.isArray(input)) return Uint8Array.from(input)
  return new TextEncoder().encode(String(input ?? ''))
}

/**
 * Base58 编码
 * @param {string|Uint8Array} input
 * @returns {string}
 */
export function base58Encode(input) {
  const bytes = toBytes(input)
  if (!bytes.length) return ''

  // 前导 0 字节在 Base58 里要单独保留，否则会被吃掉
  let zeros = 0
  while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1

  const digits = [0]
  for (let i = zeros; i < bytes.length; i += 1) {
    let carry = bytes[i]
    for (let j = 0; j < digits.length; j += 1) {
      carry += digits[j] << 8
      digits[j] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = (carry / 58) | 0
    }
  }

  let out = '1'.repeat(zeros)
  for (let i = digits.length - 1; i >= 0; i -= 1) out += BASE58_ALPHABET[digits[i]]
  return out
}

/**
 * Base58 解码
 * @param {string} input
 * @returns {Uint8Array}
 * @throws {Error} 含字母表外字符
 */
export function base58Decode(input) {
  const text = String(input ?? '')
  if (!text) return new Uint8Array(0)

  let zeros = 0
  while (zeros < text.length && text[zeros] === '1') zeros += 1

  const bytes = [0]
  for (let i = zeros; i < text.length; i += 1) {
    const value = BASE58_INDEX.get(text[i])
    if (value === undefined) throw new Error(`Base58 含非法字符「${text[i]}」`)

    let carry = value
    for (let j = 0; j < bytes.length; j += 1) {
      carry += bytes[j] * 58
      bytes[j] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }

  const out = new Uint8Array(zeros + bytes.length)
  for (let i = 0; i < bytes.length; i += 1) out[zeros + i] = bytes[bytes.length - 1 - i]
  return out
}

/** 工具页的可选算法（value 与 cipher-text 页的 Tab 对应） */
export const CIPHER_TYPES = [
  { value: 'rot13', label: 'ROT13' },
  { value: 'caesar', label: '凯撒移位' },
  { value: 'morse', label: '摩斯电码' },
  { value: 'base58', label: 'Base58' },
]
