// ============================================================
// HTML 实体编解码
// 纯字符串实现，不依赖 DOMParser / textarea —— 单元测试跑在 node 环境（无 DOM），
// 且浏览器 innerText 方案会静默改写未知实体，行为不可控。
//   - escapeHtml：只处理 & < > " ' 五个字符
//   - unescapeHtml：数字实体（十进制 / 十六进制，含 > 0xFFFF 的码点）全量支持；
//     命名实体按下方收录表解码，**未收录或未写分号的名称原样保留**（不猜测、不吞字符）
//   - 收录范围：ASCII 保留字符 + ISO 8859-1 全集 + 常用标点/符号/箭头/数学/希腊字母
//   - 需要「全量非 ASCII 转实体」（邮件模板兼容旧客户端）用 escapeHtmlNonAscii
// ============================================================

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

// ISO 8859-1（Latin-1）命名实体：名字 → 码点。写码点而非字面量，避免转录出错。
const LATIN1 = {
  nbsp: 0x00a0,
  iexcl: 0x00a1,
  cent: 0x00a2,
  pound: 0x00a3,
  curren: 0x00a4,
  yen: 0x00a5,
  brvbar: 0x00a6,
  sect: 0x00a7,
  uml: 0x00a8,
  copy: 0x00a9,
  ordf: 0x00aa,
  laquo: 0x00ab,
  not: 0x00ac,
  shy: 0x00ad,
  reg: 0x00ae,
  macr: 0x00af,
  deg: 0x00b0,
  plusmn: 0x00b1,
  sup2: 0x00b2,
  sup3: 0x00b3,
  acute: 0x00b4,
  micro: 0x00b5,
  para: 0x00b6,
  middot: 0x00b7,
  cedil: 0x00b8,
  sup1: 0x00b9,
  ordm: 0x00ba,
  raquo: 0x00bb,
  frac14: 0x00bc,
  frac12: 0x00bd,
  frac34: 0x00be,
  iquest: 0x00bf,
  Agrave: 0x00c0,
  Aacute: 0x00c1,
  Acirc: 0x00c2,
  Atilde: 0x00c3,
  Auml: 0x00c4,
  Aring: 0x00c5,
  AElig: 0x00c6,
  Ccedil: 0x00c7,
  Egrave: 0x00c8,
  Eacute: 0x00c9,
  Ecirc: 0x00ca,
  Euml: 0x00cb,
  Igrave: 0x00cc,
  Iacute: 0x00cd,
  Icirc: 0x00ce,
  Iuml: 0x00cf,
  ETH: 0x00d0,
  Ntilde: 0x00d1,
  Ograve: 0x00d2,
  Oacute: 0x00d3,
  Ocirc: 0x00d4,
  Otilde: 0x00d5,
  Ouml: 0x00d6,
  times: 0x00d7,
  Oslash: 0x00d8,
  Ugrave: 0x00d9,
  Uacute: 0x00da,
  Ucirc: 0x00db,
  Uuml: 0x00dc,
  Yacute: 0x00dd,
  THORN: 0x00de,
  szlig: 0x00df,
  agrave: 0x00e0,
  aacute: 0x00e1,
  acirc: 0x00e2,
  atilde: 0x00e3,
  auml: 0x00e4,
  aring: 0x00e5,
  aelig: 0x00e6,
  ccedil: 0x00e7,
  egrave: 0x00e8,
  eacute: 0x00e9,
  ecirc: 0x00ea,
  euml: 0x00eb,
  igrave: 0x00ec,
  iacute: 0x00ed,
  icirc: 0x00ee,
  iuml: 0x00ef,
  eth: 0x00f0,
  ntilde: 0x00f1,
  ograve: 0x00f2,
  oacute: 0x00f3,
  ocirc: 0x00f4,
  otilde: 0x00f5,
  ouml: 0x00f6,
  divide: 0x00f7,
  oslash: 0x00f8,
  ugrave: 0x00f9,
  uacute: 0x00fa,
  ucirc: 0x00fb,
  uuml: 0x00fc,
  yacute: 0x00fd,
  thorn: 0x00fe,
  yuml: 0x00ff,
}

// 非 Latin-1 的常用符号实体（均为 BMP 内单一码点）
const SYMBOLS = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  zwnj: '‌',
  zwj: '‍',
  lrm: '‎',
  rlm: '‏',
  trade: '™',
  bull: '•',
  hellip: '…',
  prime: '′',
  Prime: '″',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  lsaquo: '‹',
  rsaquo: '›',
  mdash: '—',
  ndash: '–',
  minus: '−',
  permil: '‰',
  euro: '€',
  larr: '←',
  uarr: '↑',
  rarr: '→',
  darr: '↓',
  harr: '↔',
  crarr: '↵',
  lArr: '⇐',
  rArr: '⇒',
  infin: '∞',
  ne: '≠',
  le: '≤',
  ge: '≥',
  equiv: '≡',
  sim: '∼',
  asymp: '≈',
  cong: '≅',
  sub: '⊂',
  sup: '⊃',
  sube: '⊆',
  supe: '⊇',
  in: '∈',
  notin: '∉',
  empty: '∅',
  nabla: '∇',
  part: '∂',
  radic: '√',
  sum: '∑',
  prod: '∏',
  int: '∫',
  there: '∴',
  check: '✓',
  cross: '✗',
  starf: '★',
  loz: '◊',
  clubs: '♣',
  diams: '♦',
  hearts: '♥',
  spades: '♠',
}

// 小写希腊字母 α–ω 在 U+03B1..U+03C9 连续（第 18 个是词终形 sigmav），按序 zip。
const GREEK_LOWER_NAMES = [
  'alpha',
  'beta',
  'gamma',
  'delta',
  'epsilon',
  'zeta',
  'eta',
  'theta',
  'iota',
  'kappa',
  'lambda',
  'mu',
  'nu',
  'xi',
  'omicron',
  'pi',
  'rho',
  'sigmav',
  'sigma',
  'tau',
  'upsilon',
  'phi',
  'chi',
  'psi',
  'omega',
]

const GREEK_LOWER = Object.fromEntries(
  GREEK_LOWER_NAMES.map((name, i) => [name, String.fromCodePoint(0x03b1 + i)])
)

const NAMED_ENTITIES = {
  ...Object.fromEntries(Object.entries(LATIN1).map(([n, cp]) => [n, String.fromCodePoint(cp)])),
  ...SYMBOLS,
  // 只收录小写希腊字母：&Alpha; 这类大写名几乎不会出现在粘贴内容里，
  // 而大写区码点不连续（无词终 σ 对应位），收益不足以抵掉转录出错的风险。
  ...GREEK_LOWER,
}

// 大写形式兜底：&AMP; / &LT; 这类 HTML5 全大写写法也要能解
const NAMED_BY_LOWER = new Map()
for (const [name, value] of Object.entries(NAMED_ENTITIES)) {
  const key = name.toLowerCase()
  if (!NAMED_BY_LOWER.has(key)) NAMED_BY_LOWER.set(key, value)
}

// 命名实体：字母开头 + 字母数字，必须以分号结束；数字实体：&#123; / &#x1F600; / &#X4C;
const ENTITY_RE = /&(#(?:x|X)[0-9a-fA-F]+|#\d+|[a-zA-Z][0-9a-zA-Z]*);/g

/**
 * 转义为在 HTML 文本 / 属性中安全的字符串
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch])
}

/**
 * 转义保留字符，并把所有非 ASCII 字符转为十进制数字实体（结果全 ASCII）
 * 用 for...of 按码点迭代：正则按 UTF-16 码元匹配会把 😀 拆成两个代理项各出一个实体。
 * @param {string} str
 * @returns {string}
 */
export function escapeHtmlNonAscii(str) {
  let out = ''
  for (const ch of escapeHtml(str)) {
    const codePoint = ch.codePointAt(0)
    out += codePoint < 0x80 ? ch : `&#${codePoint};`
  }
  return out
}

/**
 * 反转义 HTML 实体
 * @param {string} str
 * @returns {string} 未知实体与缺分号的写法原样保留
 */
export function unescapeHtml(str) {
  return String(str ?? '').replace(ENTITY_RE, (whole, body) => {
    if (body[0] === '#') {
      const isHex = body[1] === 'x' || body[1] === 'X'
      const num = Number.parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10)
      if (!Number.isFinite(num) || num < 0 || num > 0x10ffff) return whole
      // 代理区码点无法独立成字符
      if (num >= 0xd800 && num <= 0xdfff) return whole
      return String.fromCodePoint(num)
    }
    const hit = NAMED_BY_LOWER.get(body) ?? NAMED_BY_LOWER.get(body.toLowerCase())
    return hit === undefined ? whole : hit
  })
}

/**
 * 未被识别的命名实体（供 UI 提示，避免用户以为「解码没生效」）
 * @param {string} str
 * @returns {string[]} 形如 ['&foo;', '&Bar;']
 */
export function unknownEntities(str) {
  const found = new Set()
  for (const [whole, body] of String(str ?? '').matchAll(ENTITY_RE)) {
    if (body[0] === '#') continue
    if (!NAMED_BY_LOWER.has(body) && !NAMED_BY_LOWER.has(body.toLowerCase())) found.add(whole)
  }
  return [...found]
}

/**
 * 计数，用于 UI 反馈
 * @param {string} str
 * @returns {{entities: number, specials: number}}
 */
export function analyzeHtml(str) {
  const text = String(str ?? '')
  return {
    entities: [...text.matchAll(ENTITY_RE)].length,
    specials: (text.match(/[&<>"']/g) || []).length,
  }
}
