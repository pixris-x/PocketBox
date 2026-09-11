// ============================================================
// 日期计算工具（基于 Date，UTC 计算避免 DST 坑）
// 约定：所有日期用 YYYY-MM-DD 字符串或 Date 对象的 UTC 00:00 表示。
// 内部统一用 Date.UTC(年, 月-1, 日) 创建/操作，再 toISOString().slice(0,10) 格式化，
// 这样无论用户所在时区，'2024-01-01' 始终代表同一个物理日（不存在本地时区偏移）。
// ============================================================

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** YYYY-MM-DD 字符串 → Date（UTC 00:00） */
export function parseDate(input) {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) throw new Error('无效的 Date 对象')
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()))
  }
  const text = String(input ?? '').trim()
  if (!text) throw new Error('日期不能为空')
  const m = ISO_RE.exec(text)
  if (!m) throw new Error('日期格式必须为 YYYY-MM-DD')
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  // 严格校验：月 1-12，日范围由当月决定
  if (month < 1 || month > 12) throw new Error('月份必须在 01–12 之间')
  if (day < 1 || day > daysInMonth(year, month)) {
    throw new Error(
      `日期「${text}」超出当月范围（${year}-${String(month).padStart(2, '0')} 最多 ${daysInMonth(year, month)} 天）`
    )
  }
  return new Date(Date.UTC(year, month - 1, day))
}

/** Date 或 parseDate 输入 → 'YYYY-MM-DD' */
export function formatDate(input) {
  const d = parseDate(input)
  return d.toISOString().slice(0, 10)
}

/** 是否闰年（能被 4 整除且不能被 100 整除，或能被 400 整除） */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** 指定年月的天数（1-31） */
export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

const MS_PER_DAY = 86400000

/**
 * 两日期之差（按日精度）
 * @param {string|Date} a
 * @param {string|Date} b
 * @returns {{ from: string, to: string, totalDays: number, direction: 'forward'|'backward'|'same',
 *            years: number, months: number, days: number, breakdown: string }}
 */
export function diffDates(a, b) {
  const d1 = parseDate(a)
  const d2 = parseDate(b)
  const fromStr = formatDate(d1)
  const toStr = formatDate(d2)
  if (d1.getTime() === d2.getTime()) {
    return {
      from: fromStr,
      to: toStr,
      totalDays: 0,
      direction: 'same',
      years: 0,
      months: 0,
      days: 0,
      breakdown: '0 天',
    }
  }
  const forward = d2.getTime() > d1.getTime()
  const [start, end] = forward ? [d1, d2] : [d2, d1]
  let years = end.getUTCFullYear() - start.getUTCFullYear()
  let months = end.getUTCMonth() - start.getUTCMonth()
  if (end.getUTCDate() < start.getUTCDate()) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }
  // 余下天数 = 从 start + years+months 跳到 end 还差几天
  const anchorMs = Date.UTC(
    start.getUTCFullYear() + years,
    start.getUTCMonth() + months,
    start.getUTCDate()
  )
  const days = Math.round((end.getTime() - anchorMs) / MS_PER_DAY)
  const totalDays = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)
  return {
    from: fromStr,
    to: toStr,
    totalDays,
    direction: forward ? 'forward' : 'backward',
    years,
    months,
    days,
    breakdown: breakdownText(years, months, days),
  }
}

function breakdownText(years, months, days) {
  const parts = []
  if (years) parts.push(`${years} 年`)
  if (months) parts.push(`${months} 个月`)
  if (days || parts.length === 0) parts.push(`${days} 天`)
  return parts.join(' ')
}

/**
 * 在日期上加减
 * @param {string|Date} base
 * @param {{ years?: number, months?: number, weeks?: number, days?: number, workdays?: number }} amount
 *   各字段均可为负数（减）；workdays 跳过周六周日
 * @returns {string} 'YYYY-MM-DD'
 */
export function addToDate(base, amount) {
  const d = parseDate(base)
  const { years = 0, months = 0, weeks = 0, days = 0, workdays = 0 } = amount
  // 年/月：按"目标月日数不够时夹紧到月末"的常见约定处理
  let targetYear = d.getUTCFullYear() + years
  let targetMonth = d.getUTCMonth() + months
  while (targetMonth >= 12) {
    targetMonth -= 12
    targetYear += 1
  }
  while (targetMonth < 0) {
    targetMonth += 12
    targetYear -= 1
  }
  const originalDay = d.getUTCDate()
  const lastDay = daysInMonth(targetYear, targetMonth + 1)
  const targetDay = Math.min(originalDay, lastDay)
  let result = new Date(Date.UTC(targetYear, targetMonth, targetDay))
  // 周/日：UTC 算术
  if (weeks) result = new Date(result.getTime() + weeks * 7 * MS_PER_DAY)
  if (days) result = new Date(result.getTime() + days * MS_PER_DAY)
  // 工作日：依次跳到下一个工作日
  if (workdays) {
    let step = workdays > 0 ? 1 : -1
    let remaining = Math.abs(workdays)
    while (remaining > 0) {
      result = new Date(result.getTime() + step * MS_PER_DAY)
      const dow = result.getUTCDay()
      if (dow !== 0 && dow !== 6) remaining -= 1
    }
  }
  return formatDate(result)
}

/** 高频常用：今天（YYYY-MM-DD，本地日历） */
export function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
