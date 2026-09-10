// ============================================================
// 文本批处理纯函数（无副作用、无 DOM 依赖）
// 供「文本批处理」等页面复用
// ============================================================

/** 大小写处理模式（UiSelect 选项） */
export const CASE_MODES = [
  { value: 'none', label: '保持原样' },
  { value: 'upper', label: '全部大写' },
  { value: 'lower', label: '全部小写' },
  { value: 'title', label: '每个单词首字母大写' },
  { value: 'sentence', label: '每句首字母大写' },
]

/** 行排序方式（UiSelect 选项） */
export const SORT_MODES = [
  { value: 'none', label: '保持原序' },
  { value: 'asc', label: '按字母升序' },
  { value: 'desc', label: '按字母降序' },
  { value: 'length-asc', label: '按长度升序' },
  { value: 'length-desc', label: '按长度降序' },
]

/** 每个单词首字母大写（仅作用于拉丁字母，中文等非字母字符原样保留） */
function toTitleCase(text) {
  return text.replace(/[A-Za-z]+/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
}

/** 每句首字母大写：以 . ! ? 。！？ 加空白，或文本/行开头作为句子边界 */
function toSentenceCase(text) {
  return text
    .toLowerCase()
    .replace(
      /(^|\n\s*|[.!?。！？]\s+)([a-z])/g,
      (match, boundary, letter) => boundary + letter.toUpperCase()
    )
}

/**
 * 按模式转换大小写
 * @param {string} text
 * @param {string} mode 见 CASE_MODES 的 value
 */
export function applyCase(text, mode) {
  switch (mode) {
    case 'upper':
      return text.toUpperCase()
    case 'lower':
      return text.toLowerCase()
    case 'title':
      return toTitleCase(text)
    case 'sentence':
      return toSentenceCase(text)
    default:
      return text
  }
}

/** 按模式排序行；'none' 或未知模式返回原数组（不修改入参） */
function sortLines(lines, mode) {
  const compare = {
    asc: (a, b) => a.localeCompare(b, 'zh'),
    desc: (a, b) => b.localeCompare(a, 'zh'),
    'length-asc': (a, b) => a.length - b.length,
    'length-desc': (a, b) => b.length - a.length,
  }[mode]
  return compare ? [...lines].sort(compare) : lines
}

/**
 * 文本批处理流水线（顺序固定，见下）
 * 1. 每行去除首尾空白 → 2. 移除空行 → 3. 去除重复行（保留首次出现）
 * → 4. 排序 → 5. 大小写转换
 * 大小写放在最后，是为了让「每句/每词首字母大写」看到的是最终文本。
 * @param {string} text
 * @param {object} [options]
 * @returns {string} 统一以 \n 连接
 */
export function processText(text, options = {}) {
  if (!text) return ''
  const {
    trimLines = false,
    removeEmptyLines = false,
    uniqueLines = false,
    sortMode = 'none',
    caseMode = 'none',
  } = options

  let lines = text.split(/\r?\n/)
  if (trimLines) lines = lines.map((line) => line.trim())
  if (removeEmptyLines) lines = lines.filter((line) => line.trim() !== '')
  if (uniqueLines) lines = [...new Set(lines)]
  lines = sortLines(lines, sortMode)

  return applyCase(lines.join('\n'), caseMode)
}

/** 词数：优先用 Intl.Segmenter 分词（中文可用），不支持时退化为按空白切分 */
function countWords(text) {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter('zh', { granularity: 'word' })
    let count = 0
    for (const segment of segmenter.segment(text)) {
      if (segment.isWordLike) count++
    }
    return count
  }
  const matched = text.trim().match(/\S+/g)
  return matched ? matched.length : 0
}

/**
 * 文本统计
 * @param {string} text
 * @returns {{chars:number, charsNoSpace:number, lines:number, nonEmptyLines:number, words:number}}
 */
export function countText(text) {
  if (!text) return { chars: 0, charsNoSpace: 0, lines: 0, nonEmptyLines: 0, words: 0 }
  const lines = text.split(/\r?\n/)
  return {
    chars: text.length,
    charsNoSpace: text.replace(/\s/g, '').length,
    lines: lines.length,
    nonEmptyLines: lines.filter((line) => line.trim() !== '').length,
    words: countWords(text),
  }
}
