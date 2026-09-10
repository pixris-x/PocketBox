// ============================================================
// 命名风格转换纯函数（无副作用、无 DOM 依赖）
// 供「命名风格转换」页面复用
// ============================================================

/** 支持的命名风格（数组顺序即页面展示顺序） */
export const NAMING_STYLES = [
  { id: 'camel', label: 'camelCase' },
  { id: 'pascal', label: 'PascalCase' },
  { id: 'snake', label: 'snake_case' },
  { id: 'constant', label: 'CONSTANT_CASE' },
  { id: 'kebab', label: 'kebab-case' },
  { id: 'dot', label: 'dot.case' },
  { id: 'title', label: 'Title Case' },
  { id: 'space', label: 'lower space' },
]

const CJK = '\\u4e00-\\u9fff'

/**
 * 把任意写法的标识符切成单词数组
 * 支持：分隔符（_ - . 空格 / 等）、camelCase 边界、连续大写缩写（HTTPServer）、
 * 中英混排（用户Name）、字母与数字混合（user2Name）。
 * @param {string} input
 * @returns {string[]}
 */
export function splitWords(input) {
  if (!input) return []
  return (
    String(input)
      // 小写/数字 → 大写：fooBar → foo Bar
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      // 连续大写缩写 → 大写+小写：HTTPServer → HTTP Server
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      // 中文与拉丁字母/数字之间断开
      .replace(new RegExp(`([${CJK}])([A-Za-z0-9])`, 'g'), '$1 $2')
      .replace(new RegExp(`([A-Za-z0-9])([${CJK}])`, 'g'), '$1 $2')
      // 其余非字母数字非中文的字符（各类分隔符）统一当分隔
      .replace(new RegExp(`[^A-Za-z0-9${CJK}]+`, 'g'), ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
  )
}

/** 首字母大写 + 其余小写；中文等无大小写的字符原样保留 */
function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/**
 * 按指定风格拼接单词
 * @param {string} input 原始标识符
 * @param {string} style 见 NAMING_STYLES 的 id
 * @returns {string} 转换结果，输入为空时返回空串
 */
export function convertNaming(input, style) {
  const words = splitWords(input)
  if (!words.length) return ''

  const lower = words.map((word) => word.toLowerCase())

  switch (style) {
    case 'camel':
      return words
        .map((word, index) => (index === 0 ? word.toLowerCase() : capitalize(word)))
        .join('')
    case 'pascal':
      return words.map(capitalize).join('')
    case 'snake':
      return lower.join('_')
    case 'constant':
      return words.map((word) => word.toUpperCase()).join('_')
    case 'kebab':
      return lower.join('-')
    case 'dot':
      return lower.join('.')
    case 'title':
      return words.map(capitalize).join(' ')
    case 'space':
      return lower.join(' ')
    default:
      return input
  }
}

/**
 * 一次性得到全部风格的转换结果
 * @param {string} input
 * @returns {{id:string, label:string, value:string}[]}
 */
export function convertAllNamings(input) {
  return NAMING_STYLES.map((style) => ({ ...style, value: convertNaming(input, style.id) }))
}
