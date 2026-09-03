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
