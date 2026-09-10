// 通用格式化工具
/**
 * 将字节数格式化为可读字符串
 * @param {number} bytes
 * @param {number} [digits]
 * @returns {string} 例：'1.2 KB'
 */
export function formatBytes(bytes, digits = 1) {
  if (!Number.isFinite(bytes) || bytes < 0) return '-'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** i
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : digits)} ${units[i]}`
}

/**
 * 数字千分位分隔
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
  if (!Number.isFinite(num)) return '-'
  return num.toLocaleString('en-US')
}

/**
 * 按有效数字格式化，消除浮点尾数（例：0.30000000000000004 → '0.3'）
 * 与 formatNumber 的区别：本函数不做千分位、不做固定小数位，
 * 用于需要保留精度的数值输出（单位换算、物理量计算等）。
 * 默认 15 位有效数字：双精度能保证的安全位数，既能消掉尾数噪声，
 * 又能让 1099511627776 这类大整数原样输出（降到 10 位会被截断）。
 * @param {number} num
 * @param {number} [digits] 有效数字位数
 * @returns {string} 非有限值返回 '-'
 */
export function formatSignificant(num, digits = 15) {
  if (!Number.isFinite(num)) return '-'
  if (num === 0) return '0'
  const rounded = Number(num.toPrecision(digits))
  // 有效位数不足以表示该数量级（如 1e-20）时退回科学计数法
  if (rounded === 0) return num.toExponential(Math.max(0, digits - 1))
  return String(rounded)
}

/**
 * 计算节省百分比
 * @param {number} original
 * @param {number} current
 * @returns {number} 0~100，original<=0 时为 0
 */
export function savingPercent(original, current) {
  if (!original || original <= 0) return 0
  const pct = ((original - current) / original) * 100
  return Math.max(0, Math.min(100, pct))
}
