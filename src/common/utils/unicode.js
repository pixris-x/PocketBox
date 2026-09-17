// ============================================================
// Unicode / 字符编码纯函数
//   - inspectText：逐码点拆解，给出码点、UTF-8 字节、HTML 实体、JS 转义
//   - decodeRefs：把 U+4E2D / \u4E2D / \u{1F600} / &#x4E2D; / &#20013; 还原为字符
//   - encodeHtmlEntities：HTML 转义（命名实体 + 非 ASCII 数字实体可选）
// ============================================================

const encoder = new TextEncoder()

const HTML_NAMED = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

/**
 * 逐码点检查文本（emoji 等代理对按单个码点拆分）
 * @param {string} text
 * @returns {{char:string, codePoint:number, hex:string, utf8:number[], jsEscape:string}[]}
 */
export function inspectText(text) {
  const value = String(text ?? '')
  return [...value].map((char) => {
    const codePoint = char.codePointAt(0)
    return {
      char,
      codePoint,
      hex: toHexCodePoint(codePoint),
      utf8: [...encoder.encode(char)],
      jsEscape: toJsEscape(codePoint),
    }
  })
}

/** U+4E2D 形式（6 位十六进制，超 BMP 自动加位） */
export function toHexCodePoint(codePoint) {
  const hex = codePoint.toString(16).toUpperCase()
  return `U+${hex.padStart(4, '0')}`
}

/** BMP 用 \uXXXX，增补平面用 \u{...} */
export function toJsEscape(codePoint) {
  return codePoint > 0xffff
    ? `\\u{${codePoint.toString(16).toUpperCase()}}`
    : `\\u${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
}

/**
 * 还原各种「字符引用 / 转义」写法。支持混排：文本中出现的
 * U+4E2D、\u4E2D、\u{4E2D}、&#x4E2D;、&#x4E2D（无分号）、&#20013; 均替换为对应字符。
 * 无法识别的部分原样保留。
 * @param {string} input
 * @returns {string}
 */
export function decodeRefs(input) {
  const text = String(input ?? '')
  if (!text) return ''
  return text.replace(
    /\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})|&#x([0-9a-fA-F]+);?|&#(\d+);?|U\+([0-9a-fA-F]{4,6})/g,
    (match, brace, u4, hexNum, decNum, uplus) => {
      const hex = brace || u4 || hexNum || uplus
      const codePoint = hex ? Number.parseInt(hex, 16) : Number.parseInt(decNum, 10)
      if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match
      // 代理区（D800-DFFF）单独出现不合法，原样保留
      if (codePoint >= 0xd800 && codePoint <= 0xdfff) return match
      return String.fromCodePoint(codePoint)
    }
  )
}

/**
 * HTML 转义：& < > " ' 用命名实体；escapeNonAscii 时其余字符用 &#xHEX; 数字实体
 * @param {string} text
 * @param {{escapeNonAscii?: boolean}} [options]
 */
export function encodeHtmlEntities(text, { escapeNonAscii = false } = {}) {
  const value = String(text ?? '')
  let out = ''
  for (const char of value) {
    if (HTML_NAMED[char]) {
      out += HTML_NAMED[char]
    } else if (escapeNonAscii && char.codePointAt(0) > 0x7e) {
      out += `&#x${char.codePointAt(0).toString(16).toUpperCase()};`
    } else {
      out += char
    }
  }
  return out
}
