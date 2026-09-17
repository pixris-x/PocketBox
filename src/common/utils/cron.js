// ============================================================
// Cron 表达式解析纯函数（5 段：分 时 日 月 周；无依赖、无 DOM）
//   - 支持：* / 数字 / 范围 a-b（含环绕如 DEC-FEB）/ 步进 a-b/n、*/n
//     英文月名（JAN-DEC）与星期名（SUN-SAT，0 与 7 都是周日）/ @宏
//   - dom 与 dow 同时受限时按 vixie cron 规则取「或」
//   - getCronNextRuns 逐分钟扫描，上限 10 年，日期用本地时区
// 损坏输入：parseCron 返回 {ok:false, error}，绝不抛异常；
//          getCronNextRuns 对非法表达式抛出带中文信息的 Error。
// ============================================================

const FIELD_DEFS = [
  { key: 'minute', label: '分钟', min: 0, max: 59 },
  { key: 'hour', label: '小时', min: 0, max: 23 },
  { key: 'dom', label: '日', min: 1, max: 31 },
  { key: 'month', label: '月', min: 1, max: 12 },
  { key: 'dow', label: '星期', min: 0, max: 7 },
]

const MONTH_NAMES = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
}

const DOW_NAMES = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
}

const MACROS = {
  '@hourly': '0 * * * *',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@weekly': '0 0 * * 0',
  '@monthly': '0 0 1 * *',
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
}

// 扫描上限：10 年的分钟数。比这更稀疏的表达式（如每闰年 2 月 29 日）返回不足额结果。
const MAX_SCAN_MINUTES = 10 * 366 * 24 * 60

/**
 * 解析 Cron 表达式
 * @returns {{ok: true, fields: Object, macro: string|null, expression: string}
 *          | {ok: false, error: string}}
 */
export function parseCron(expr) {
  const original = String(expr ?? '').trim()
  if (!original) return { ok: false, error: '表达式为空' }

  let expression = original
  let macro = null
  const lower = original.toLowerCase()
  if (MACROS[lower]) {
    macro = lower
    expression = MACROS[lower]
  }

  const parts = expression.split(/\s+/)
  if (parts.length !== 5) {
    return { ok: false, error: `字段数应为 5 个（分 时 日 月 周），实际 ${parts.length} 个` }
  }

  const fields = {}
  for (let i = 0; i < 5; i++) {
    const def = FIELD_DEFS[i]
    const parsed = expandField(parts[i], def, i === 4)
    if (!parsed.ok) return { ok: false, error: `${def.label}字段无效：${parsed.error}` }
    fields[def.key] = parsed.field
  }

  return { ok: true, fields, macro, expression }
}

/**
 * 预测未来执行时间（本地时区，秒级截断）
 * @param {string} expr Cron 表达式
 * @param {Date} [from] 起始时间，默认当前
 * @param {number} [count] 最多返回几次，默认 5
 * @returns {Date[]} 表达式非法时抛出 Error
 */
export function getCronNextRuns(expr, from = new Date(), count = 5) {
  const parsed = parseCron(expr)
  if (!parsed.ok) throw new Error(parsed.error)

  const anchor = new Date(from.getTime())
  anchor.setSeconds(0, 0)
  anchor.setMinutes(anchor.getMinutes() + 1)

  const runs = []
  const cursor = new Date(anchor.getTime())
  for (let i = 0; i < MAX_SCAN_MINUTES && runs.length < count; i++) {
    if (matchTime(parsed.fields, cursor)) runs.push(new Date(cursor.getTime()))
    cursor.setMinutes(cursor.getMinutes() + 1)
  }
  return runs
}

const WEEKDAY_TEXT = ['日', '一', '二', '三', '四', '五', '六']

/** 字段中文概述（供展示，非严格自然语言） */
export function describeCron(parsed) {
  if (!parsed?.ok) return ''
  const f = parsed.fields
  const minute = f.minute.wildcard ? '每分钟' : `第 ${joinValues(f.minute.values)} 分`
  const hour = f.hour.wildcard ? '每小时' : `${joinValues(f.hour.values)} 点`
  const dom = f.dom.wildcard ? '每日' : `${joinValues(f.dom.values)} 日`
  const month = f.month.wildcard ? '每月' : `${joinValues(f.month.values)} 月`
  const dow = f.dow.wildcard
    ? '每周不限'
    : `周${f.dow.values.map((v) => WEEKDAY_TEXT[v]).join('、')}`
  return `${month} ${dom}（${dow}）${hour} ${minute}`
}

function joinValues(values) {
  const shown = values.length > 8 ? `${values.slice(0, 8).join('、')}…` : values.join('、')
  return shown
}

/** 解析单个字段：返回 {ok:true, field:{wildcard, values}} | {ok:false, error} */
function expandField(raw, def, isDow) {
  const text = raw.trim().toLowerCase()
  if (text === '*') return { ok: true, field: { wildcard: true, values: null } }

  const values = new Set()
  const tokens = text.split(',')
  for (const token of tokens) {
    const result = expandToken(token.trim(), def, isDow)
    if (!result.ok) return result
    for (const value of result.values) values.add(value)
  }

  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length === 0) {
    return { ok: false, error: '没有可匹配的值' }
  }
  return { ok: true, field: { wildcard: false, values: sorted } }
}

function expandToken(token, def, isDow) {
  if (!token) return { ok: false, error: '存在空片段' }

  // 拆步进：a-b/n、*/n、a/n、a-b
  const slashIndex = token.indexOf('/')
  let rangePart = token
  let step = 1
  if (slashIndex !== -1) {
    rangePart = token.slice(0, slashIndex)
    const stepPart = token.slice(slashIndex + 1)
    step = parseBound(stepPart, def, isDow)
    if (step == null || step <= 0) {
      return { ok: false, error: `步进「${stepPart}」必须是正整数` }
    }
  }

  let start = def.min
  let end = def.max
  if (rangePart !== '*') {
    const dashIndex = rangePart.indexOf('-')
    if (dashIndex === -1) {
      // 单值：a/n 表示 a-max/n（vixie 语义）
      start = parseBound(rangePart, def, isDow)
      if (start == null) return { ok: false, error: `「${rangePart}」不是合法的${def.label}` }
      end = def.max
      // 单值带步进只在显式写出 /n 时有意义；无步进时就是单值
      if (slashIndex === -1) end = start
    } else {
      start = parseBound(rangePart.slice(0, dashIndex), def, isDow)
      end = parseBound(rangePart.slice(dashIndex + 1), def, isDow)
      if (start == null || end == null) {
        return { ok: false, error: `「${rangePart}」不是合法的${def.label}范围` }
      }
    }
  }

  // 环绕范围（如 11-1 月、5-1 周）：拆成两段
  const values = new Set()
  if (start <= end) {
    for (let v = start; v <= end; v += step) values.add(normalizeDow(v, isDow))
  } else {
    for (let v = start; v <= def.max; v += step) values.add(normalizeDow(v, isDow))
    for (let v = def.min; v <= end; v += step) values.add(normalizeDow(v, isDow))
  }
  return { ok: true, values: [...values] }
}

/** 解析数字或英文名；dow 的 7 归一为 0 */
function parseBound(text, def, isDow) {
  if (/^\d+$/.test(text)) {
    const value = Number(text)
    if (value < def.min || value > def.max) return null
    return isDow && value === 7 ? 0 : value
  }
  if (isDow && DOW_NAMES[text] != null) return DOW_NAMES[text]
  if (!isDow && MONTH_NAMES[text] != null) return MONTH_NAMES[text]
  return null
}

function normalizeDow(value, isDow) {
  return isDow && value === 7 ? 0 : value
}

/**
 * 时间匹配。vixie 规则：dom 与 dow 都「受限」时，二者满足其一即命中；
 * 否则全部字段取「且」（未受限字段恒为真）。
 */
function matchTime(fields, date) {
  if (!matchField(fields.minute, date.getMinutes())) return false
  if (!matchField(fields.hour, date.getHours())) return false
  if (!matchField(fields.month, date.getMonth() + 1)) return false

  const domRestricted = !fields.dom.wildcard
  const dowRestricted = !fields.dow.wildcard
  if (domRestricted && dowRestricted) {
    return fields.dom.values.includes(date.getDate()) || fields.dow.values.includes(date.getDay())
  }
  return matchField(fields.dom, date.getDate()) && matchField(fields.dow, date.getDay())
}

function matchField(field, value) {
  if (field.wildcard) return true
  return field.values.includes(value)
}
