// ============================================================
// 空白符清理纯函数（无副作用、无 DOM 依赖）
// 供「空白符清理」页面复用。
//
// 推荐方案 = 按字符类的两阶段正则（normalizeWhitespace）：
//   - 不破坏换行结构（除非显式 collapseNewlines）
//   - 行内压缩用 [^\S\n] 覆盖 ASCII 空格/制表符/全角空格(\u3000)/不换行空格(\u00a0)/其他 Unicode 空白
//   - 与「文本批处理」的区别：后者只做每行 trim + 去空行，不压缩行内连续空格、不处理全角空格、不能合并单行
// ============================================================

/** 选项默认值（同时也是 UI 各开关的默认态） */
export const WS_DEFAULTS = {
  collapseSpaces: true,
  trimLines: true,
  removeEmptyLines: false,
  collapseNewlines: false,
}

/**
 * 归一化文本中的多余空白（推荐方案：按字符类的两阶段正则）
 *
 * 处理范围：
 *  - 行尾归一：CRLF(\r\n) / 旧 Mac(\r) 一律转为 \n
 *  - 行内压缩：连续的空格 / 制表符 / 全角空格(\u3000) / 不换行空格(\u00a0) / 其他 Unicode 空白（除换行外）
 *    压成单个普通空格
 *  - 行首尾修剪：trimLines 时去掉每行首尾空白；默认还会裁掉整段首尾的空行（内部空行保留）
 *  - 删除空行：removeEmptyLines 时删掉所有纯空白行
 *  - 合并为单行：collapseNewlines 时把换行也当空白压缩，输出无换行的单行文本（等价于方案 A）
 *
 * @param {string} text 输入文本（非字符串按空串处理）
 * @param {object} [options]
 * @param {boolean} [options.collapseSpaces=true]   压缩行内连续空白为单个空格
 * @param {boolean} [options.trimLines=true]        去除每行首尾空白，并裁掉整段首尾空行
 * @param {boolean} [options.removeEmptyLines=false] 删除所有纯空白行
 * @param {boolean} [options.collapseNewlines=false] 把换行也当空白压缩（输出单行）
 * @returns {string}
 */
export function normalizeWhitespace(text, options = {}) {
  if (typeof text !== 'string') return ''
  const { collapseSpaces, trimLines, removeEmptyLines, collapseNewlines } = {
    ...WS_DEFAULTS,
    ...options,
  }
  if (text === '') return ''

  // 1) 行尾归一：先吃 \r\n，再吃单独 \r（旧 Mac），统一为 \n
  let s = text.replace(/\r\n?/g, '\n')

  // 2) 合并为单行模式：所有空白（含换行）一次性压成单个空格
  if (collapseNewlines) {
    s = s.replace(/\s+/g, ' ')
    return trimLines ? s.trim() : s
  }

  // 3) 逐行处理，保留换行结构
  const lines = s.split('\n')
  let processed = lines.map((line) => {
    let l = line
    // [^\S\n] = 任意「非换行的空白」，覆盖 ASCII 空格/制表符/NBSP/全角空格等
    if (collapseSpaces) l = l.replace(/[^\S\n]+/g, ' ')
    if (trimLines) l = l.trim()
    return l
  })

  if (removeEmptyLines) {
    processed = processed.filter((line) => line !== '')
  } else if (trimLines) {
    // 裁掉整段首尾的空行（中间空行保留，除非 removeEmptyLines）
    let start = 0
    let end = processed.length - 1
    while (start <= end && processed[start] === '') start++
    while (end > start && processed[end] === '') end--
    processed = processed.slice(start, end + 1)
  }

  return processed.join('\n')
}

/**
 * 统计一段文本中的空白字符数（用于展示「压缩掉多少空白」）
 * @param {string} text
 * @returns {number}
 */
export function countWhitespace(text) {
  if (typeof text !== 'string' || text === '') return 0
  const matched = text.match(/\s/g)
  return matched ? matched.length : 0
}
