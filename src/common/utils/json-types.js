// ============================================================
// JSON → 语言类型定义推断（无副作用、无 DOM 依赖）
// 纯本地计算：把任意 JSON 值推断成结构化类型树，再渲染成各语言代码。
//
// 推断能力：
//   - 对象字段取并集，只在部分样本中出现的字段标记为可选
//     （数组里放多个对象时最典型，缺字段的对象会补出 ? / omitempty / = None）
//   - 同层出现不同类型时合并为联合类型
//   - 整数与浮点在 Go / Python / Java 中区分，TypeScript 统一 number
//   - 嵌套对象按「父类型名 + 字段名」生成独立类型，不把整棵树挤进一个声明
//   - JSON 本身无环，故类型集合必然有限，无需处理递归引用
// ============================================================

import { convertNaming } from './naming'

/** 递归深度兜底：JSON.parse 已挡掉极深结构，这里防的是归并时的意外嵌套 */
const MAX_DEPTH = 24

/** Python 保留字：作字段名时追加下划线（class → class_） */
const PY_KEYWORDS = new Set([
  'False',
  'None',
  'True',
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
  'with',
  'yield',
])

/**
 * C# 关键字：属性名撞上关键字时加 @ 前缀（这是 C# 的惯例做法，
 * 比改名更贴近「键名原样」的需求）。
 */
const CS_KEYWORDS = new Set([
  'abstract',
  'as',
  'base',
  'bool',
  'break',
  'byte',
  'case',
  'catch',
  'char',
  'checked',
  'class',
  'const',
  'continue',
  'decimal',
  'default',
  'delegate',
  'do',
  'double',
  'else',
  'enum',
  'event',
  'explicit',
  'extern',
  'false',
  'finally',
  'fixed',
  'float',
  'for',
  'foreach',
  'goto',
  'if',
  'implicit',
  'in',
  'int',
  'interface',
  'internal',
  'is',
  'lock',
  'long',
  'namespace',
  'new',
  'null',
  'object',
  'operator',
  'out',
  'override',
  'params',
  'private',
  'protected',
  'public',
  'readonly',
  'ref',
  'return',
  'sbyte',
  'sealed',
  'short',
  'sizeof',
  'stackalloc',
  'static',
  'string',
  'struct',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'uint',
  'ulong',
  'unchecked',
  'unsafe',
  'ushort',
  'using',
  'virtual',
  'void',
  'volatile',
  'while',
])

/**
 * 支持的目标语言（数组顺序即页面展示顺序）
 * 用 `id` 而非 `value`：页面把它 map 成 UiSelect 选项（UiSelect 只认 value），
 * 同时 jsonToAllTypes 的返回项也要带 ext 供下载命名
 */
export const JSON_TYPE_LANGUAGES = [
  { id: 'typescript', label: 'TypeScript', ext: 'ts' },
  { id: 'go', label: 'Go', ext: 'go' },
  { id: 'python', label: 'Python', ext: 'py' },
  { id: 'java', label: 'Java', ext: 'java' },
  { id: 'csharp', label: 'C#', ext: 'cs' },
]

/**
 * 可选的字段命名风格（页面用；keep = 保留 JSON 原始键名）
 * ⚠ key 必须是 `value` —— UiSelect 只认 option.value，写成 id 会让选中后赋值 undefined
 */
export const JSON_TYPE_NAMINGS = [
  { value: 'keep', label: '保留原名' },
  { value: 'camel', label: 'camelCase' },
  { value: 'snake', label: 'snake_case' },
  { value: 'pascal', label: 'PascalCase' },
]

/** 可选的缩进（页面用） */
export const JSON_TYPE_INDENTS = [
  { label: '2 空格', value: 2 },
  { label: '4 空格', value: 4 },
  { label: 'Tab', value: 'tab' },
]

/** 各语言默认的字段命名风格（页面切换语言时据此回填，避免两处维护） */
export const JSON_TYPE_DEFAULT_NAMING = {
  typescript: 'keep',
  go: 'pascal',
  python: 'snake',
  java: 'camel',
  csharp: 'pascal',
}

// ============================================================
// 一、类型树推断
// ============================================================

/**
 * 推断单个 JSON 值的类型节点
 * @param {any} value
 * @param {number} [depth]
 * @returns {object} 类型节点
 */
export function inferJsonType(value, depth = 0) {
  if (depth > MAX_DEPTH) return { kind: 'unknown' }
  if (value === null) return { kind: 'null' }
  if (Array.isArray(value)) return inferArray(value, depth)
  if (typeof value === 'object') return inferObject(value, depth)

  const kind = typeof value
  if (kind === 'number') return numberNode(value)
  if (kind === 'string' || kind === 'boolean') return { kind }
  return { kind: 'unknown' }
}

/**
 * 数字节点：除整数/浮点外还带上值域，
 * 供 C# 区分 int 与 long（JSON 本身不带这个信息，只能按范围推断）
 * @param {number} value
 * @returns {object}
 */
function numberNode(value) {
  return { kind: 'number', integer: Number.isInteger(value), min: value, max: value }
}

/** int32 上界；超出则用 long（64 位） */
const INT32_MAX = 2147483647
const INT32_MIN = -2147483648

function inferArray(list, depth) {
  // 空数组元素类型未知，用 element: null 表示
  if (!list.length) return { kind: 'array', element: null }

  let element = inferJsonType(list[0], depth + 1)
  for (let i = 1; i < list.length; i += 1) {
    element = mergeNodes(element, inferJsonType(list[i], depth + 1))
  }
  return { kind: 'array', element }
}

function inferObject(obj, depth) {
  return {
    kind: 'object',
    fields: Object.keys(obj).map((key) => ({
      key,
      node: inferJsonType(obj[key], depth + 1),
      // 同一对象的字段都实际出现过；可选性由归并时补
      optional: false,
    })),
  }
}

/**
 * 归并两个类型节点，得到它们公共的父类型
 * 对象取字段并集（缺失方标记可选），不同标量并成联合类型。
 * @param {object} a
 * @param {object} b
 * @returns {object}
 */
export function mergeNodes(a, b) {
  if (!a) return b
  if (!b) return a
  if (a.kind === 'object' && b.kind === 'object') return mergeObjects(a, b)

  if (a.kind === 'array' && b.kind === 'array') {
    // 空数组不贡献元素类型
    if (!a.element) return b
    if (!b.element) return a
    return { kind: 'array', element: mergeNodes(a.element, b.element) }
  }

  if (a.kind === b.kind) {
    // 整数与浮点归并后按浮点处理，避免 int/float 混用
    if (a.kind === 'number') {
      return {
        kind: 'number',
        integer: a.integer && b.integer,
        min: Math.min(a.min, b.min),
        max: Math.max(a.max, b.max),
      }
    }
    return a
  }

  return mergeUnions([a, b])
}

function mergeObjects(a, b) {
  const seen = new Set()
  const merged = a.fields.map((field) => {
    seen.add(field.key)
    const other = b.fields.find((item) => item.key === field.key)
    // 只在 a 里出现 → 缺失的 b 让它变成可选
    if (!other) return { ...field, optional: true }
    return { ...field, node: mergeNodes(field.node, other.node) }
  })

  for (const field of b.fields) {
    if (seen.has(field.key)) continue
    // 只在 b 里出现 → 可选
    merged.push({ ...field, optional: true })
  }

  return { kind: 'object', fields: merged }
}

/** 合并为联合类型：嵌套展平、成员去重、顺序稳定 */
function mergeUnions(members) {
  const flat = []
  const seen = new Set()

  for (const member of members) {
    // 展平嵌套联合，避免生成 A | (B | C) 这种冗余
    for (const item of member.kind === 'union' ? member.members : [member]) {
      // number 的整数/浮点差异不算不同类型
      const key = item.kind === 'number' ? 'number' : nodeKey(item)
      if (seen.has(key)) continue
      seen.add(key)
      flat.push(item)
    }
  }

  return flat.length === 1 ? flat[0] : { kind: 'union', members: flat }
}

function nodeKey(node) {
  if (node.kind === 'array') return `array<${node.element ? nodeKey(node.element) : 'any'}>`
  if (node.kind === 'object') return `object{${node.fields.map((f) => f.key).join(',')}}`
  if (node.kind === 'union') return `union<${node.members.map(nodeKey).join('|')}>`
  return node.kind
}

// ============================================================
// 二、字段与类型命名
// ============================================================

/** 除 Python 外的语言都吃这套标识符规则 */
const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/

/**
 * Python 3 标识符：首字符不能是数字，其余允许 Unicode 字母、数字与下划线。
 * 必须用 u + \p{ID_Continue} 这类 Unicode 属性判断——JS 的 \w 只覆盖 ASCII，
 * 会把中文键误判为非法。
 * 用整体锚定的写法，不能拆成 /^[^\W\d]|[^\x00-\x7F]/ 这种形式，
 * 否则 `|` 的优先级会让后半支单独生效，把 'user-name' 的连字符误判为合法。
 */
const PY_IDENT_RE = /^[\p{ID_Start}_][\p{ID_Continue}]*$/u

/**
 * 各语言的标识符校验与回退风格
 * Python 3 允许 Unicode 标识符，故中文键本身合法，只拦数字开头与保留字
 */
const NAME_RULES = {
  // TS 允许任意字符串键，非法键名用引号包裹即可
  typescript: { valid: (t) => IDENT_RE.test(t), fallback: 'camel' },
  go: { valid: (t) => IDENT_RE.test(t), fallback: 'pascal' },
  python: { valid: (t) => PY_IDENT_RE.test(t), fallback: 'snake' },
  java: { valid: (t) => IDENT_RE.test(t), fallback: 'camel' },
  csharp: { valid: (t) => IDENT_RE.test(t), fallback: 'pascal' },
}

/**
 * 计算字段在目标语言中的名字
 * 原键名合法就用它；否则按所选风格转换，仍不合法再退到该语言的回退风格；
 * 都不行时加前缀兜底（键名以数字开头时转换后依然非法，如 '1num' → snake 仍是 '1_num'）。
 * @param {string} key 原始键名
 * @param {string} naming 命名风格 id
 * @param {string} lang 语言 id
 * @returns {string}
 */
export function fieldName(key, naming, lang) {
  const rule = NAME_RULES[lang] || NAME_RULES.typescript

  // keep = 保留原始键名；原键名本身就合法时直接用
  if (naming === 'keep' && rule.valid(key)) {
    return finalizeName(key, lang)
  }

  // 用户显式选了风格就必须生效，故先试所选风格，再退到该语言的默认风格
  for (const style of naming === 'keep' ? [rule.fallback] : [naming, rule.fallback]) {
    const converted = convertNaming(key, style)
    if (!converted) continue
    // 拆词转换救不了的典型是首字符为数字（'1num' → pascal 仍是 '1num'），补下划线前缀
    const patched = /^[0-9]/.test(converted) ? `_${converted}` : converted
    if (rule.valid(patched)) return finalizeName(patched, lang)
  }

  // 连前缀都救不回来（纯符号键等）：用键名哈希兜底，保证不同键不会撞名
  return finalizeName(`field${hashCode(key)}`, lang)
}

/** 稳定的短哈希（djb2），仅用于生成兜底字段名 */
function hashCode(text) {
  let hash = 5381
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 33) ^ text.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

/** 按语言做最后一道处理：Python 保留字加下划线，C# 关键字加 @ 前缀 */
function finalizeName(name, lang) {
  if (lang === 'python') return avoidPythonKeyword(name)
  if (lang === 'csharp') return avoidCsharpKeyword(name)
  return name
}

function avoidPythonKeyword(name) {
  return PY_KEYWORDS.has(name) ? `${name}_` : name
}

/**
 * C# 用 @ 前缀转义标识符，这样键名能原样保留（@class 而非 Class），
 * 序列化时 [JsonProperty] 仍按原名输出
 * @param {string} name
 * @returns {string}
 */
function avoidCsharpKeyword(name) {
  return CS_KEYWORDS.has(name) ? `@${name}` : name
}

/** 顶层类型名：清掉非法字符并转 PascalCase，不合法时用 fallback */
export function rootTypeName(input, fallback = 'Root') {
  const converted = convertNaming(String(input || ''), 'pascal')
  if (!converted) return fallback
  return /^[A-Za-z_$]/.test(converted) ? converted : fallback
}

// ============================================================
// 三、渲染
//
// 核心约定：typeText（字段处的类型写法）与 decls（类型声明）严格分离。
// typeText 只负责「这里写什么类型」，嵌套结构通过 collector 登记一条声明，
// 由 renderType 统一按「父在子前」的顺序拼接，避免出现先引用后声明。
// ============================================================

/** 缩进配置展开成前缀 */
function padOf(indent, level) {
  return indent === 'tab' ? '\t'.repeat(level) : ' '.repeat(Number(indent) * level)
}

/** 顶层入口：渲染一棵类型树为完整代码 */
function renderType(node, options) {
  const decls = []
  const name = claimName(rootTypeName(options.typeName, 'Root'), decls, options)
  emitDeclaration(node, { ...options, name }, decls)
  const code = decls.map((item) => item.code).join('\n\n')
  const post = POST_PROCESS[options.lang]
  return post ? post(code) : code
}

/**
 * 为 node 生成一条声明并推入 decls
 * 标量 / 联合 / 空容器没有可展开的结构，退化为类型别名。
 * @param {object} node
 * @param {object} options 带 name 的上下文
 * @param {Array} decls
 * @returns {string} 该类型在字段处的引用名
 */
function emitDeclaration(node, options, decls) {
  const { lang, indent, name } = options

  if (node.kind === 'object' && node.fields.length) {
    const lines = node.fields.map((field) => {
      const base = nestedName(name, field.key, options)
      const fieldNameText = claimName(base, decls, options)
      // 子声明先入列，渲染时父在前、子在后
      const typeText = refType(field.node, { ...options, name: fieldNameText, decls })
      return fieldLine(field, typeText, options, fieldNameText)
    })
    decls.push({ name, code: blockCode(name, lines, options) })
    return name
  }

  const typeText = refType(node, { ...options, name, decls })
  decls.push({ name, code: aliasCode(name, typeText, options) })
  return name
}

/** 重名加序号，保证同一份输出里类型名唯一 */
function claimName(base, decls) {
  let name = base
  let seq = 2
  while (decls.some((item) => item.name === name)) {
    name = `${base}${seq}`
    seq += 1
  }
  return name
}

/** 类型别名：标量根节点、空对象、空数组等无展开结构的情况 */
function aliasCode(name, typeText, options) {
  const { lang } = options
  if (lang === 'typescript') return `export type ${name} = ${typeText}`
  if (lang === 'go') return `type ${name} ${typeText}`
  if (lang === 'python') return `${name} = ${typeText}`
  // Java / C# 没有类型别名，用一个只含 value 成员的类承载；typeText 必须是合法类型名
  if (lang === 'csharp')
    return `public class ${name} {\n  public ${typeText} Value { get; set; }\n}`
  return `public class ${name} {\n  private ${typeText} value;\n}`
}

/** 具名类型声明体（interface / struct / dataclass / class） */
function blockCode(name, lines, options) {
  const { lang, indent } = options
  if (lang === 'python') {
    // dataclass 要求无默认值的字段全部排在有默认值的前面
    const required = lines.filter((line) => !line.endsWith('= None'))
    const optional = lines.filter((line) => line.endsWith('= None'))
    const body = [...required, ...optional].map((line) => padOf(indent, 1) + line).join('\n')
    return `@dataclass\nclass ${name}:\n${body}`
  }

  const body = lines.map((line) => padOf(indent, 1) + line).join('\n')
  if (lang === 'typescript') return `export interface ${name} {\n${body}\n}`
  if (lang === 'go') return `type ${name} struct {\n${body}\n}`
  return `public class ${name} {\n${body}\n}`
}

/** 嵌套类型名 = 父类型名 + 字段名 */
function nestedName(parent, key, options) {
  return rootTypeName(`${parent} ${fieldName(key, options.naming, options.lang)}`)
}

/**
 * 求某个节点在字段处的类型文本；容器节点在此登记声明
 * @param {object} node
 * @param {object} options 带 name / decls 的上下文
 * @returns {string}
 */
function refType(node, options) {
  const { lang, decls } = options

  if (node.kind === 'object') {
    // 空对象无法展开成具名结构，按键值未知的字典处理
    if (!node.fields.length) return emptyObjectType(lang)
    return emitDeclaration(node, options, decls)
  }

  if (node.kind === 'array') {
    if (!node.element) return emptyArrayType(lang)
    // 数组元素的类型名用「基址 + Item」，比逐字段命名自然
    const elementOptions = { ...options, name: `${options.name}Item` }
    const elementText = refType(node.element, elementOptions)
    // 元素是联合类型时必须加括号，否则 arrayType 会只包住最后一段（number | string[]）
    return arrayType(
      lang === 'go' || !elementText.includes(' | ') ? elementText : `(${elementText})`,
      lang
    )
  }

  if (node.kind === 'union') {
    // Go / Java / C# 都没有联合类型，只能退化到宽类型
    if (lang === 'go') return 'interface{}'
    if (lang === 'java') return 'Object'
    if (lang === 'csharp') return 'object'
    const members = node.members.map((member) => refType(member, options))
    return lang === 'python' ? `Union[${members.join(', ')}]` : members.join(' | ')
  }

  return typeOf(node, options)
}

/** 字段行：四种语言的字段名、可选标记、标签写法都在这里收口 */
function fieldLine(field, typeText, options, typeName) {
  const { lang, naming } = options
  // Python 的嵌套类型可能定义在后面，注解写成字符串更安全
  const text = lang === 'python' && isNamedType(field.node) ? `"${typeName}"` : typeText
  const name = fieldName(field.key, naming, lang)

  if (lang === 'typescript') {
    // TS 允许任意字符串键，非标识符键名用引号包裹
    const key = naming === 'keep' && !IDENT_RE.test(field.key) ? `"${field.key}"` : name
    return `${key}${field.optional ? '?' : ''}: ${text}`
  }

  if (lang === 'go') {
    const tag = field.optional ? `json:"${field.key},omitempty"` : `json:"${field.key}"`
    return `${name} ${text} \`${tag}\``
  }

  if (lang === 'python') {
    // 可选字段必须带默认值，否则 dataclass 会当成必填，导致后面字段全部报错
    return field.optional ? `${name}: Optional[${text}] = None` : `${name}: ${text}`
  }

  if (lang === 'csharp') {
    // C# 值类型（int / long / double / bool）不可为 null，可选字段要包一层 Nullable<T>
    const valueType = field.optional ? nullableValueType(text) : text
    // C# 惯例是公开属性而非字段
    return `public ${valueType} ${name} { get; set; }${jsonPropertyAttribute(field, name)}`
  }

  return `private ${text} ${name};`
}

/** C# 值类型加问号变可空；已经是引用类型（含泛型）则原样返回 */
function nullableValueType(text) {
  if (['int', 'long', 'double', 'bool', 'float', 'decimal', 'short', 'byte'].includes(text)) {
    return `${text}?`
  }
  return text
}

/**
 * C# 的 [JsonPropertyName] 特性：只在属性名与原始键名不一致时才加，
 * 否则每个属性都挂特性太吵。命名风格非 pascal 时属性名已转换，必须挂。
 * @param {object} field
 * @param {string} name 最终属性名
 * @returns {string}
 */
function jsonPropertyAttribute(field, name) {
  return name === field.key ? '' : ` [JsonPropertyName("${field.key}")]`
}

/** 该节点是否会生成具名声明（决定 Python 注解要不要加引号） */
function isNamedType(node) {
  return node.kind === 'object' && node.fields.length > 0
}

/** 单个非容器节点的类型文本 */
function typeOf(node, options) {
  const { lang } = options
  switch (node.kind) {
    case 'string':
      // Java 的 String 首字母大写；C# / TS / Go / Python 都是小写内置类型名
      return lang === 'java' ? 'String' : 'string'
    case 'boolean':
      return lang === 'java' ? 'Boolean' : 'boolean'
    case 'null':
      // Go 无 null，Python 用 None；Java / C# 无 null 类型只能落到 object
      if (lang === 'go') return 'interface{}'
      if (lang === 'python') return 'None'
      if (lang === 'java' || lang === 'csharp') return 'object'
      return 'null'
    case 'number':
      return numberType(node, lang)
    default:
      return unknownType(lang)
  }
}

/**
 * 数值类型：JSON 不带 int/long 之分，
 * C# 按值域推断（超出 int32 用 long），其余语言按整数/浮点二分
 * @param {object} node number 节点（带 min / max）
 * @param {string} lang
 * @returns {string}
 */
function numberType(node, lang) {
  if (lang === 'typescript') return 'number'
  if (lang === 'python') return node.integer ? 'int' : 'float'
  if (lang === 'go') return node.integer ? 'int' : 'float64'
  // C#：超出 int32 值域说明 id 之类的字段可能很大，用 long 更稳
  if (lang === 'csharp') {
    if (!node.integer) return 'double'
    const fitsInt = node.min >= INT32_MIN && node.max <= INT32_MAX
    return fitsInt ? 'int' : 'long'
  }
  // Java：浮点必须用 Double，整数用 Integer，两者都是包装类型（可为空）
  return node.integer ? 'Integer' : 'Double'
}

function unknownType(lang) {
  if (lang === 'go') return 'interface{}'
  if (lang === 'python') return 'Any'
  if (lang === 'java' || lang === 'csharp') return 'object'
  return 'unknown'
}

function arrayType(elementText, lang) {
  if (lang === 'go') return `[]${elementText}`
  if (lang === 'python') return `list[${elementText}]`
  if (lang === 'java' || lang === 'csharp') return `List<${elementText}>`
  return `${elementText}[]`
}

function emptyArrayType(lang) {
  if (lang === 'go') return '[]interface{}'
  if (lang === 'python') return 'list[Any]'
  if (lang === 'java' || lang === 'csharp') return 'List<object>'
  return 'unknown[]'
}

function emptyObjectType(lang) {
  if (lang === 'go') return 'map[string]interface{}'
  if (lang === 'python') return 'dict[str, Any]'
  if (lang === 'java') return 'Map<String, Object>'
  if (lang === 'csharp') return 'Dictionary<string, object>'
  return 'Record<string, unknown>'
}

// ============================================================
// 四、后处理
// ============================================================

function pythonPostProcess(code) {
  const typing = []
  if (/\bOptional\[/.test(code)) typing.push('Optional')
  if (/\bUnion\[/.test(code)) typing.push('Union')
  if (/\bAny\b/.test(code)) typing.push('Any')

  const head = []
  if (typing.length) head.push(`from typing import ${typing.join(', ')}`)
  if (code.includes('@dataclass')) head.push('from dataclasses import dataclass')

  return head.length ? `${head.join('\n')}\n\n${code}` : code
}

/**
 * Java：按实际用到的类型补 import。
 * 字段类型已由 numberType 直接给出包装类型（Integer / Double），
 * 因此这里只负责 import，不再做类型名改写。
 */
function javaPostProcess(code) {
  const imports = ['List', 'Map', 'Object']
    .filter((name) => new RegExp(`\\b${name}\\b`).test(code))
    .map((name) => `import java.util.${name};`)

  return imports.length ? `${imports.join('\n')}\n\n${code}` : code
}

/**
 * C#：按实际用到的类型补 using，并加上启用可空引用类型的开关。
 * int / long / double / bool / string 这些内置类型不需要 using。
 */
function csharpPostProcess(code) {
  const head = []
  if (/\bList<|\bDictionary</.test(code)) head.push('using System.Collections.Generic;')
  if (/\bJsonPropertyName\(/.test(code)) head.push('using System.Text.Json.Serialization;')

  const body = head.length ? `${head.join('\n')}\n\n${code}` : code
  // 值类型可空（如 int?）在未开启可空引用类型的项目里毫无意义，故显式打开
  return `#nullable enable\n\n${body}`
}

const POST_PROCESS = {
  python: pythonPostProcess,
  java: javaPostProcess,
  csharp: csharpPostProcess,
}

// ============================================================
// 五、对外主入口
// ============================================================

/**
 * 把 JSON 文本转成目标语言的类型定义
 * @param {string} text JSON 文本
 * @param {object} [options]
 * @param {string} [options.lang] 语言 id，见 JSON_TYPE_LANGUAGES
 * @param {string} [options.typeName] 顶层类型名
 * @param {string} [options.naming] 字段命名风格；不传按语言取默认
 * @param {number|string} [options.indent] 缩进
 * @returns {string} 类型定义代码
 * @throws {Error} JSON 解析失败（由调用方展示）
 */
export function jsonToType(text, options = {}) {
  const lang = options.lang || 'typescript'
  const naming = options.naming || JSON_TYPE_DEFAULT_NAMING[lang] || 'keep'
  return renderType(inferJsonType(JSON.parse(text)), {
    lang,
    naming,
    indent: options.indent ?? 2,
    typeName: options.typeName,
  })
}

/**
 * 一次产出全部支持语言的结果
 * @param {string} text
 * @param {object} [options] 同 jsonToType（typeName / naming / indent）
 * @returns {{id:string,label:string,ext:string,code:string}[]}
 * @throws {Error} JSON 解析失败
 */
export function jsonToAllTypes(text, options = {}) {
  return JSON_TYPE_LANGUAGES.map((lang) => ({
    ...lang,
    code: jsonToType(text, { ...options, lang: lang.id }),
  }))
}

/**
 * 统计类型树规模，用于页面概览
 * @param {string} text
 * @returns {{types:number, fields:number, maxDepth:number}} 解析失败返回全 0
 */
export function summarizeTypeStats(text) {
  let value
  try {
    value = JSON.parse(text)
  } catch {
    return { types: 0, fields: 0, maxDepth: 0 }
  }

  let types = 0
  let fields = 0
  let maxDepth = 0

  function walk(node, depth) {
    if (!node) return
    types += 1
    if (depth > maxDepth) maxDepth = depth
    if (node.kind === 'array') {
      walk(node.element, depth)
      return
    }
    if (node.kind !== 'object') return
    for (const field of node.fields) {
      fields += 1
      walk(field.node, depth + 1)
    }
  }

  walk(inferJsonType(value), 0)
  return { types, fields, maxDepth }
}
