// ============================================================
// 证件与联系方式校验、敏感信息脱敏（无副作用、无 DOM 依赖）
// 纯本地计算，不联网、不存储。
//
// 校验：
//   - 身份证（二代 18 位 GB 11643-1999）：校验位加权、地区码、生日有效性、性别
//   - 15 位老身份证：按 GB 11643 规则升位到 18 位后复用同一套校验
//   - 银行卡：Luhn 校验位 + 常见 BIN 前缀识别发卡行
//   - 中国大陆手机号：号段与位数
// 脱敏：
//   手机号 / 身份证 / 银行卡 / 姓名 / 邮箱 / 地址 / 车牌，默认保留首尾若干位。
//
// 校验只判断「格式与校验位是否自洽」，不代表号码真实存在或属于某人。
// ============================================================

import { luhnValid } from './checksum'

// ============================================================
// 一、身份证
// ============================================================

/** GB 11643 加权因子 Wi = 2^(18-i) mod 11，前 17 位各一位 */
const ID_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
/** 校验码字符表：余数 → 'X' 或数字（余数 2 对应 'X'） */
const ID_CHECK_CHARS = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

/**
 * 省级行政区划代码（GB/T 2260 前两位）。
 * 只收省级——市级代码变动频繁，收进来只会过期。
 */
const ID_PROVINCES = {
  11: '北京',
  12: '天津',
  13: '河北',
  14: '山西',
  15: '内蒙古',
  21: '辽宁',
  22: '吉林',
  23: '黑龙江',
  31: '上海',
  32: '江苏',
  33: '浙江',
  34: '安徽',
  35: '福建',
  36: '江西',
  37: '山东',
  41: '河南',
  42: '湖北',
  43: '湖南',
  44: '广东',
  45: '广西',
  46: '海南',
  50: '重庆',
  51: '四川',
  52: '贵州',
  53: '云南',
  54: '西藏',
  61: '陕西',
  62: '甘肃',
  63: '青海',
  64: '宁夏',
  65: '新疆',
  71: '台湾',
  81: '香港',
  82: '澳门',
}

/** 常见身份证号码中被公开用于校验的示例（不对应真实个人） */
const ID_EXAMPLE = '11010519491231002X'

/** 清洗：去掉空格与末尾的 x/X，统一大写 */
function normalizeId(input) {
  return String(input ?? '')
    .replace(/\s/g, '')
    .toUpperCase()
}

/**
 * 计算 18 位身份证的校验位
 * @param {string} first17 前 17 位
 * @returns {string} '0'~'9' 或 'X'
 * @throws {Error} 前 17 位非 17 位数字
 */
export function idCardCheckDigit(first17) {
  const text = String(first17 ?? '').replace(/\s/g, '')
  if (!/^[0-9]{17}$/.test(text)) throw new Error('前 17 位必须是 17 位数字')
  let sum = 0
  for (let i = 0; i < 17; i += 1) sum += Number(text[i]) * ID_WEIGHTS[i]
  return ID_CHECK_CHARS[sum % 11]
}

/**
 * 15 位老身份证升位为 18 位（GB 11643 规则：末位后插 '19'）
 * @param {string} old15
 * @returns {string} 18 位号码；输入不合法时原样返回
 */
export function upgradeIdCard15(old15) {
  const text = String(old15 ?? '').replace(/\s/g, '')
  if (!/^[0-9]{15}$/.test(text)) return text
  return `${text.slice(0, 6)}19${text.slice(6)}`
}

/** 校验 4 位年份是否为真实存在的日期（含闰年规则） */
function isValidBirth(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day <= daysInMonth[month - 1]
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * 校验身份证号并抽取信息
 *
 * 返回结构固定，失败时 valid 为 false 且 reason 说明原因——
 * UI 直接展示即可，无需再拼文案。
 * @param {string} input 15 位或 18 位号码，允许含空格
 * @returns {{valid:boolean, reason:string, normalized?:string, is15?:boolean,
 *   province?:string, cityCode?:string, birth?:string, birthText?:string,
 *   gender?:string, age?:number|null, checkDigit?:string}}
 */
export function validateIdCard(input) {
  const text = normalizeId(input)
  if (!text) return { valid: false, reason: '请输入身份证号码' }

  const is15 = text.length === 15
  if (!is15 && text.length !== 18) {
    return { valid: false, reason: '长度不符：身份证应为 18 位（15 位老号除外）' }
  }
  // 15 位全是数字、18 位末位可为 X，两种规则要分开判，
  // 否则 15 位会被 18 位的正则误判为「含非法字符」
  if (is15 && !/^[0-9]{15}$/.test(text)) {
    return { valid: false, reason: '含非法字符：15 位老号须为纯数字' }
  }
  if (!is15 && !/^[0-9]{17}[0-9X]$/.test(text)) {
    return { valid: false, reason: '含非法字符：末位可为 X，其余须为数字' }
  }

  const body = is15 ? upgradeIdCard15(text) : text

  // 15 位老号升位后末位必然对不上，只做格式与信息抽取，不判校验位
  if (!is15) {
    const expected = idCardCheckDigit(body.slice(0, 17))
    if (expected !== body[17]) {
      return {
        valid: false,
        reason: `校验位不符：末位应为 ${expected}`,
        normalized: body,
        is15: false,
        checkDigit: body[17],
      }
    }
  }

  const provinceCode = body.slice(0, 2)
  const province = ID_PROVINCES[Number(provinceCode)]
  if (!province) {
    return {
      valid: false,
      reason: `地区码无效：前两位 ${provinceCode} 不对应任何省级行政区`,
      normalized: body,
      is15,
    }
  }

  const year = Number(body.slice(6, 10))
  const month = Number(body.slice(10, 12))
  const day = Number(body.slice(12, 14))
  if (!isValidBirth(year, month, day)) {
    return {
      valid: false,
      reason: `出生日期无效：${year}-${month}-${day}`,
      normalized: body,
      is15,
      province,
    }
  }

  // 顺序码第 17 位：奇数为男、偶数为女
  const gender = Number(body[16]) % 2 === 1 ? '男' : '女'
  const now = new Date()
  let age = now.getFullYear() - year
  // 今年生日未到则减一
  if (now.getMonth() < month - 1 || (now.getMonth() === month - 1 && now.getDate() < day)) {
    age -= 1
  }

  return {
    valid: true,
    reason: is15 ? '15 位老身份证（未校验末位）' : '校验通过',
    normalized: body,
    is15,
    province,
    // 市级代码只到前 4 位（GB/T 2260 的地级市码为 6 位，此处给出可辨认的前 4 位）
    cityCode: body.slice(2, 6),
    birth: body.slice(6, 14),
    // 补零的 YYYY-MM-DD，避免页面再做格式化
    birthText: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    gender,
    age: age >= 0 ? age : null,
    checkDigit: body[17],
  }
}

// ============================================================
// 二、银行卡
// ============================================================

/**
 * 常见 BIN 前缀 → 卡组织。仅覆盖国内高频段，
 * 目的是给「这张卡是不是银联」一个参照，不做完整机构牌照数据。
 * ⚠ 顺序敏感：先匹配特征更强的 Visa / MasterCard / Amex / JCB，
 * 再落银联的宽段（62 段最常见，不能被 3x 段抢走）。
 */
const BANK_BINS = [
  [/^4/, 'Visa'],
  [/^5[1-5]/, 'MasterCard'],
  [/^3[47]/, 'American Express'],
  [/^35/, 'JCB'],
  [/^62/, '银联'],
  [/^81/, '银联'],
  [/^88/, '银联'],
  [/^9[059]/, '银联'],
]

/** 提取数字串：允许空格与连字符 */
function digitsOf(input) {
  return String(input ?? '').replace(/[\s-]/g, '')
}

/**
 * 校验银行卡号
 * @param {string} input 允许含空格与连字符
 * @returns {{valid:boolean, reason:string, digits?:string, length?:number, brand?:string}}
 */
export function validateBankCard(input) {
  const digits = digitsOf(input)
  if (!digits) return { valid: false, reason: '请输入银行卡号' }
  if (!/^[0-9]+$/.test(digits)) return { valid: false, reason: '含非数字字符' }
  if (digits.length < 12 || digits.length > 19) {
    return {
      valid: false,
      reason: `长度不符：银行卡应为 12~19 位（当前 ${digits.length} 位）`,
      digits,
    }
  }
  if (!luhnValid(digits)) {
    return {
      valid: false,
      reason: 'Luhn 校验未通过（末位可能输错）',
      digits,
      length: digits.length,
    }
  }
  return {
    valid: true,
    reason: '校验通过',
    digits,
    length: digits.length,
    brand: detectBankBrand(digits),
  }
}

/**
 * 识别发卡行
 * @param {string} input
 * @returns {string} 识别不到时返回 '未知发卡行'
 */
export function detectBankBrand(input) {
  const digits = digitsOf(input)
  if (!digits) return '未知卡组织'
  for (const [pattern, name] of BANK_BINS) {
    if (pattern.test(digits)) return name
  }
  return '未知卡组织'
}

// ============================================================
// 三、手机号
// ============================================================

/** 合法号段：首位 1，第二位 3-9 */
const PHONE_RE = /^1[3-9]\d{9}$/

/**
 * 校验中国大陆手机号
 * @param {string} input 允许含 +86 前缀、空格与连字符
 * @returns {{valid:boolean, reason:string, digits?:string, operator?:string}}
 */
export function validatePhone(input) {
  let digits = digitsOf(input).replace(/^\+?86/, '')
  if (!digits) return { valid: false, reason: '请输入手机号' }
  if (!/^[0-9]+$/.test(digits)) return { valid: false, reason: '含非数字字符' }
  if (digits.length !== 11) {
    return { valid: false, reason: `长度不符：应为 11 位（当前 ${digits.length} 位）`, digits }
  }
  if (!PHONE_RE.test(digits)) {
    return { valid: false, reason: '号段无效：第二位应为 3~9', digits }
  }
  return { valid: true, reason: '格式正确', digits, operator: detectOperator(digits) }
}

/**
 * 按号段判断运营商
 *
 * 号段表按工信部分配整理，只列常见前缀；未命中时返回「未知运营商」而非猜一个。
 * 顺序有讲究：先判特征更强的段（166 / 175 是联通，162 / 199 / 162 是电信），
 * 再落移动的兜底段，否则 199 会被移动的宽泛规则吃掉。
 * @param {string} input
 * @returns {string}
 */
export function detectOperator(input) {
  const digits = digitsOf(input).replace(/^\+?86/, '')
  const table = [
    // 联通：130~132、155~156、166、167、170~172、175~176、185~186、196
    [/^1(?:3[0-2]|5[56]|66|7[0-24-6]|8[56]|96)/, '中国联通'],
    // 电信：133~134、149、153、162、173~174、177、180~181、189、190~191、193、199
    [/^1(?:33|34|49|53|62|7[347]|8[019]|9[0139])/, '中国电信'],
    // 移动：其余 13x~19x
    [/^1(?:3[5-9]|5[0-35-9]|6[0-15-7]|7[3-9]|8[023478]|9[2-8])/, '中国移动'],
  ]
  for (const [pattern, name] of table) {
    if (pattern.test(digits)) return name
  }
  return '未知运营商'
}

// ============================================================
// 四、脱敏
// ============================================================

/** 用固定字符替换区间内每一位 */
function hideSegment(text, start, end) {
  return text.slice(0, start) + '*'.repeat(end - start) + text.slice(end)
}

/**
 * 通用脱敏：保留开头 head 位、结尾 tail 位，中间打码
 *
 * 两个边界要分清：
 *   - 长度 **小于** head+tail：保留不下，退化为「只留首尾各一半」
 *   - 长度 **等于** head+tail：会一个字都不遮，退化处理（等号必须走降级分支）
 * @param {string} input
 * @param {number} head 开头保留位数
 * @param {number} tail 结尾保留位数
 * @returns {string} 输入为空返回空串
 */
export function maskKeep(input, head, tail) {
  const text = String(input ?? '').replace(/\s/g, '')
  if (!text) return ''
  const h = Math.max(0, head)
  const t = Math.max(0, tail)
  // 用 <= 而非 <：长度恰好等于保留数时保留全部会等于「没脱敏」，同样要走降级
  if (text.length <= h + t) {
    const first = Math.ceil(text.length / 2)
    return hideSegment(text, first, text.length)
  }
  return hideSegment(text, h, text.length - t)
}

/** 手机号脱敏：138****8000 */
export function maskPhone(input) {
  const digits = digitsOf(input)
  if (!digits) return ''
  // 少于 7 位无法按 3+4 切，全部打码（避免短号被还原）
  if (digits.length < 7) return maskKeep(digits, 1, 1)
  return maskKeep(digits, 3, 4)
}

/** 身份证脱敏：保留前 6 后 4 或前 3 后 4 */
export function maskIdCard(input, { head = 6, tail = 4 } = {}) {
  const text = normalizeId(input)
  if (!text) return ''
  return maskKeep(text, head, tail)
}

/** 银行卡脱敏：保留后 4 位（银联规范常见做法） */
export function maskBankCard(input, { head = 0, tail = 4 } = {}) {
  const digits = digitsOf(input)
  if (!digits) return ''
  return maskKeep(digits, head, tail)
}

/** 姓名脱敏：张三 → 张*，欧阳修文 → 欧**文 */
export function maskName(input) {
  const text = String(input ?? '').trim()
  if (!text) return ''
  if (text.length === 1) return text
  if (text.length === 2) return hideSegment(text, 1, 2)
  // 三字及以上：保留首尾
  return maskKeep(text, 1, 1)
}

/** 邮箱脱敏：p***@example.com */
export function maskEmail(input) {
  const text = String(input ?? '').trim()
  if (!text) return ''
  const at = text.indexOf('@')
  if (at <= 0) return maskKeep(text, 2, 2)
  const name = text.slice(0, at)
  const domain = text.slice(at)
  return `${maskKeep(name, 1, 0)}${domain}`
}

/** 地址脱敏：保留前 N 个字（默认 6，够认出小区），其余打码 */
export function maskAddress(input, keep = 6) {
  const text = String(input ?? '').trim()
  if (!text) return ''
  return maskKeep(text, keep, 0)
}

/** 车牌脱敏：沪A12345 → 沪A****5（保留省市与末位） */
export function maskPlate(input) {
  const text = String(input ?? '')
    .replace(/\s/g, '')
    .toUpperCase()
  if (!text) return ''
  if (text.length <= 3) return maskKeep(text, 1, 1)
  return maskKeep(text, 2, 1)
}

/** 工具页可用的脱敏类型清单（id 与 label 供下拉使用） */
export const MASK_TYPES = [
  { value: 'phone', label: '手机号', hint: '138****8000' },
  { value: 'idcard', label: '身份证', hint: '110105********002X' },
  { value: 'bankcard', label: '银行卡', hint: '**** **** **** 4242' },
  { value: 'name', label: '姓名', hint: '张* / 欧**文' },
  { value: 'email', label: '邮箱', hint: 'p***@example.com' },
  { value: 'address', label: '地址', hint: '保留前 6 字' },
  { value: 'plate', label: '车牌', hint: '沪A****5' },
]

/**
 * 按类型 id 脱敏
 * @param {string} type 见 MASK_TYPES 的 value
 * @param {string} input
 * @returns {string}
 */
export function maskByType(type, input) {
  switch (type) {
    case 'phone':
      return maskPhone(input)
    case 'idcard':
      return maskIdCard(input)
    case 'bankcard':
      return maskBankCard(input)
    case 'name':
      return maskName(input)
    case 'email':
      return maskEmail(input)
    case 'address':
      return maskAddress(input)
    case 'plate':
      return maskPlate(input)
    default:
      return String(input ?? '')
  }
}

/** 供页面「填入示例」用的样例（均为规范格式的虚构数据，校验位由算法算出） */
export const VALIDATION_SAMPLES = {
  idcard: ID_EXAMPLE,
  bankcard: '6222021234567890128',
  phone: '13812345678',
}
