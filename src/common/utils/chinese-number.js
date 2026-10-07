// ============================================================
// 中文数字与人民币金额大写（无副作用、无 DOM 依赖）
//
// 数字→大写依据《正确填写票据和结算凭证的基本规定》：
//   - 数字用 零壹贰叁肆伍陆柒捌玖，单位用 拾佰仟万亿
//   - 元位是「元」（不是「圆」），角分位同理
//   - 零的写法有严格规则，是全部复杂度的来源
//
// 全部纯函数，零依赖。
// ============================================================

const DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
/** 节内单位：个 / 十 / 百 / 千（每 4 位一节） */
const SECTION_UNITS = ['', '拾', '佰', '仟']
/** 节权：万 / 亿 / 兆（每 4 位升一节） */
const GROUP_UNITS = ['', '万', '亿', '兆']

/** 中文数字 → 阿拉伯数字（用于反向解析） */
const CHAR_TO_NUM = {
  零: 0,
  〇: 0,
  一: 1,
  壹: 1,
  二: 2,
  贰: 2,
  两: 2,
  三: 3,
  叁: 3,
  四: 4,
  肆: 4,
  五: 5,
  伍: 5,
  六: 6,
  陆: 6,
  七: 7,
  柒: 7,
  八: 8,
  捌: 8,
  九: 9,
  玖: 9,
}
const SMALL_UNITS = { 拾: 10, 十: 10, 佰: 100, 百: 100, 仟: 1000, 千: 1000 }
const GROUP_CHARS = { 万: 1e4, 亿: 1e8, 兆: 1e12 }

// ============================================================
// 一、数字 → 大写
// ============================================================

/**
 * 单节（最多 4 位）转大写，处理节内零
 * @param {string} digits 4 位以内的数字串（已补零）
 * @returns {string} 不含节权
 */
function sectionToChinese(digits) {
  let text = ''
  let pendingZero = false

  for (let i = 0; i < digits.length; i += 1) {
    const digit = Number(digits[i])
    const position = digits.length - i - 1 // 0=个 1=十 2=百 3=千

    if (digit === 0) {
      // 记录「有零待写」，但整节全零时不写（交给上层判断）
      pendingZero = true
      continue
    }

    // 只有前面确实出现过非零位才补「零」，避免「壹仟零壹」写成「壹仟零壹」时多一个零
    if (pendingZero && text) text += DIGITS[0]
    pendingZero = false

    text += DIGITS[digit] + SECTION_UNITS[position]
  }

  return text
}

/**
 * 整数部分（不带小数）转大写
 * @param {string} intText 纯数字整数串
 * @returns {string}
 */
function integerToChinese(intText) {
  if (intText === '0') return ''

  // 从右往左每 4 位切一节
  const sections = []
  for (let end = intText.length; end > 0; end -= 4) {
    sections.unshift(intText.slice(Math.max(0, end - 4), end))
  }

  let result = ''
  // 记录「已经出现过但被跳过的零」，用于判断下一节是否要补「零」
  let zeroPending = false

  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i]
    // 高位补齐到 4 位，让「零壹佰」这种情况落在正确的位上
    const padded = section.padStart(4, '0')
    const text = sectionToChinese(padded)
    const groupWeight = GROUP_UNITS[sections.length - 1 - i]

    if (!text) {
      // 整节为零
      if (result) zeroPending = true
      continue
    }

    // 零只在「已经有过非零」且「本次不是紧邻的最高节」时补
    if (result && (zeroPending || padded[0] === '0')) {
      result += DIGITS[0]
    }
    zeroPending = false
    result += text + groupWeight
  }

  return result
}

/**
 * 数字转人民币大写
 *
 * @param {number|string} input 金额，支持负数、最多两位小数
 * @returns {string} 如「壹仟贰佰叁拾肆元伍角陆分」；
 *   0 返回「零元整」；非有限数返回空串
 */
export function numberToChineseCurrency(input) {
  const value = typeof input === 'number' ? input : Number(String(input).trim())
  if (!Number.isFinite(value)) return ''

  const negative = value < 0
  // 用字符串拆两部分，避免浮点误差（0.1+0.2 问题）
  const fixed = Math.abs(value).toFixed(2)
  const [intPart, decPart] = fixed.split('.')

  let text = ''
  const intText = integerToChinese(intPart)
  // 整数部分为零但有小数时，元位仍要写「零元」（如 0.5 → 零元伍角）
  text += (intText || DIGITS[0]) + '元'

  const jiao = Number(decPart[0])
  const fen = Number(decPart[1])
  if (jiao === 0 && fen === 0) {
    text += '整'
  } else {
    if (jiao > 0) text += DIGITS[jiao] + '角'
    // 角有值但分是零时不写「零分」，也不加「整」；角分都没有才加「整」
    if (fen > 0) {
      // 角为 0 且分有值时要补「零」，如 0.05 → 零元零伍分
      if (jiao === 0) text += DIGITS[0]
      text += DIGITS[fen] + '分'
    }
  }

  return (negative ? '负' : '') + text
}

/**
 * 纯数字转中文读法（不带「元角分」，用于「第几名」「几号」这类场景）
 * @param {number|string} input
 * @returns {string} 如 105 → 一百零五
 */
export function numberToChineseNumber(input) {
  const value = typeof input === 'number' ? input : Number(String(input).trim())
  if (!Number.isFinite(value) || !Number.isInteger(value)) return ''

  const text = integerToChinese(String(Math.abs(value)))
  return (value < 0 ? '负' : '') + (text || DIGITS[0])
}

// ============================================================
// 二、大写 → 数字
// ============================================================

/**
 * 人民币大写转数字
 *
 * 规则比正向更严：只接受规范的「元角分 + 整」结构，
 * 缺元位、位序颠倒、单位重复都会判为非法——不猜、不容错。
 * @param {string} input 如「壹仟贰佰叁拾肆元伍角陆分」
 * @returns {{ok:boolean, value?:number, text?:string, reason?:string}}
 */
export function chineseCurrencyToNumber(input) {
  const raw = String(input ?? '')
    .trim()
    .replace(/\s/g, '')
    // 「圆」是常见误写，宽容处理
    .replace(/圆/g, '元')

  if (!raw) return { ok: false, reason: '请输入金额大写' }

  // 「零元整」是合法的（表示 0 元），所以不能一律禁「零 + 整」。
  // 真正的冲突是：写了「整」却又显式给了角/分（零元零角整、壹元伍角整）。
  if (/整/.test(raw)) {
    const beforeWhole = raw.slice(0, raw.indexOf('元'))
    // 「整」紧跟在「元」后面（中间没有角分），说明整句只到元位
    const hasDecimal = /[角分]/.test(raw.slice(raw.indexOf('元')))
    if (hasDecimal) {
      return { ok: false, reason: '已有角分时不应再加「整」', detail: beforeWhole }
    }
  }

  const text = raw.replace(/整$|正$|正整$/, '')

  const negative = text.startsWith('负')
  const body = negative ? text.slice(1) : text

  // 必须有「元」才能认为是大写金额
  const yuanIndex = body.indexOf('元')
  if (yuanIndex < 0) return { ok: false, reason: '缺少「元」，请确认输入的是金额大写' }

  const intText = body.slice(0, yuanIndex)
  const decText = body.slice(yuanIndex + 1)
  const { value: intValue, reason: intReason } = parseChineseInteger(intText)
  if (intReason) return { ok: false, reason: intReason }

  const { value: decValue, reason: decReason } = parseChineseDecimal(decText)
  if (decReason) return { ok: false, reason: decReason }

  const result = intValue + decValue
  return {
    ok: true,
    value: negative ? -result : result,
    text: numberToChineseCurrency(negative ? -result : result),
  }
}

/** 解析中文整数部分（不含元角分） */
function parseChineseInteger(text) {
  if (text === '') return { value: 0 }
  let total = 0
  let current = 0
  let last = 0 // 上一位读到的数值，用于判断「相邻单位」与「零」的合法性
  // 是否出现过单位：决定结尾的裸数字是「个位省略」还是「缺单位」
  let hasUnit = false

  for (const char of text) {
    if (char in CHAR_TO_NUM) {
      const digit = CHAR_TO_NUM[char]
      // 连续两个数字（如「壹贰」）没有单位分隔，非法
      if (last < 10 && current >= 10) {
        return { value: 0, reason: `「${char}」前缺少单位，格式有误` }
      }
      current = current * 10 + digit
      last = digit
      continue
    }

    if (char in SMALL_UNITS) {
      const unit = SMALL_UNITS[char]
      if (current === 0) {
        // 「拾伍」这种省略「壹」的前导写法是规范的，值为 15
        current = 1
      }
      if (current > unit) return { value: 0, reason: `「${char}」用法有误` }
      total += current * unit
      current = 0
      last = unit
      hasUnit = true
      continue
    }

    if (char in GROUP_CHARS) {
      const group = GROUP_CHARS[char]
      // 「万」后面跟的当前节若为 0（如「壹佰万」合法、「零万」非法）
      total = (total + current) * group
      current = 0
      last = group
      hasUnit = true
      continue
    }

    return { value: 0, reason: `「${char}」不是有效的大写字符` }
  }

  if (current > 0) {
    // 结尾是裸数字时，取决于前面有没有单位：
    //   「壹佰贰拾叁」→ current=3 且前面有单位，个位省略单位是规范写法，值为 123
    //   「壹佰贰」    → current=12（两位数字裸串）且无单位，非法
    if (current < 10 && hasUnit) {
      total += current
      return { value: total }
    }
    return { value: 0, reason: '结尾缺少单位，格式有误' }
  }
  return { value: total }
}

/** 解析中文角分部分 */
function parseChineseDecimal(text) {
  if (text === '') return { value: 0 }
  const match = text.match(/^(?:([零壹贰叁肆伍陆柒捌玖])角)?(?:零?([零壹贰叁肆伍陆柒捌玖])分)?$/)
  if (!match) return { value: 0, reason: '角分部分格式有误' }
  if (!match[1] && !match[2]) return { value: 0, reason: '角分部分格式有误' }

  const jiao = match[1] ? CHAR_TO_NUM[match[1]] : 0
  const fen = match[2] ? CHAR_TO_NUM[match[2]] : 0
  if (jiao === 0 && fen === 0) return { value: 0, reason: '角分不能同时为零' }
  return { value: jiao * 0.1 + fen * 0.01 }
}

/** 工具页示例：覆盖零、节权、角分整等典型情况 */
export const CURRENCY_SAMPLES = [
  { value: 1234.56, label: '1234.56' },
  { value: 1001, label: '1001' },
  { value: 10000, label: '10000' },
  { value: 10001, label: '10001' },
  { value: 0.5, label: '0.5' },
  { value: 0.05, label: '0.05' },
  { value: 10, label: '10' },
  { value: 105, label: '105' },
  { value: -1234.5, label: '-1234.5' },
]
