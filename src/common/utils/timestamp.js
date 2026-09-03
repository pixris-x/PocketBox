// 时间戳 ↔ 日期转换工具
const pad = (n) => String(n).padStart(2, '0')

/**
 * 时间戳 → Date
 * @param {number} ts
 * @param {{ms?: boolean}} [options] ms=true 表示输入为毫秒（默认秒）
 * @returns {Date}
 */
export function tsToDate(ts, { ms = false } = {}) {
  const value = ms ? ts : ts * 1000
  return new Date(value)
}

/** Date → 本地时间字符串 'YYYY-MM-DD HH:mm:ss' */
export function dateToLocalString(date) {
  if (Number.isNaN(date.getTime())) return '无效日期'
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`
}

/** Date → UTC 时间字符串 'YYYY-MM-DD HH:mm:ss' */
export function dateToUtcString(date) {
  if (Number.isNaN(date.getTime())) return '无效日期'
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(
    date.getUTCHours()
  )}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
}

/** Date → ISO 字符串 */
export function dateToIsoString(date) {
  if (Number.isNaN(date.getTime())) return '无效日期'
  return date.toISOString()
}

/** 日期字符串/Date → 秒时间戳；无效返回 null */
export function dateToTs(input, { ms = false } = {}) {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return null
  const ts = date.getTime()
  return ms ? ts : Math.floor(ts / 1000)
}

/** 当前时间戳 */
export function nowTs({ ms = false } = {}) {
  return ms ? Date.now() : Math.floor(Date.now() / 1000)
}

/** 校验时间戳是否在合理范围内（1970-01-01 至 2100-01-01） */
export function isValidTimestamp(ts) {
  if (!Number.isFinite(ts)) return false
  const ms = ts > 1e11 ? ts : ts * 1000 // 毫秒 vs 秒
  return ms >= 0 && ms <= 4102444800000 // 2100-01-01
}
