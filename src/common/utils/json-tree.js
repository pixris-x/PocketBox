// JSON 树形结构：把 JSON 解析为带元信息的节点树
// 供树形视图页使用；错误提示复用 json.js 的 parseJson（带行列定位）
import { parseJson } from './json'

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/

/** 推断 JS 值的数据类型字符串 */
export function typeOfValue(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value // object / string / number / boolean
}

/**
 * 解析 JSON 文本并构建节点树
 * @param {string} text
 * @returns {object} 根节点（path 为 '$'）
 * @throws {Error} 沿用 parseJson 的「第 N 行，第 M 列」提示
 */
export function buildJsonTree(text) {
  return createNode(parseJson(text), null, '$', 0)
}

function createNode(value, key, path, depth) {
  const type = typeOfValue(value)

  if (type === 'object') {
    const entries = Object.entries(value)
    return {
      key,
      path,
      type,
      depth,
      size: entries.length,
      value: null,
      children: entries.map(([childKey, childValue]) =>
        createNode(childValue, childKey, appendKey(path, childKey), depth + 1)
      ),
    }
  }

  if (type === 'array') {
    return {
      key,
      path,
      type,
      depth,
      size: value.length,
      value: null,
      children: value.map((item, index) =>
        createNode(item, String(index), `${path}[${index}]`, depth + 1)
      ),
    }
  }

  return { key, path, type, depth, size: 0, value, children: [] }
}

// 对象子节点的路径拼接：合法标识符用点号，否则用方括号 + 引号
function appendKey(parentPath, key) {
  return IDENT_RE.test(key) ? `${parentPath}.${key}` : `${parentPath}[${JSON.stringify(key)}]`
}

/**
 * 容器节点的规模描述，如「3 个键」「5 项」
 * @param {object} node
 * @returns {string} 叶子节点返回空串
 */
export function describeSize(node) {
  if (node.type === 'object') return `${node.size} 个键`
  if (node.type === 'array') return `${node.size} 项`
  return ''
}

/**
 * 叶子节点的值预览（字符串不带引号，过长截断）
 * @param {object} node
 * @param {number} max 字符串最大展示长度
 */
export function previewValue(node, max = 120) {
  if (node.type === 'string') {
    const text = node.value
    return text.length > max ? `${text.slice(0, max)}…` : text
  }
  if (node.type === 'null') return 'null'
  if (node.type === 'object' || node.type === 'array') return ''
  return String(node.value)
}

/** 把叶子节点的值转成可复制的字符串（含类型信息时另说，这里取纯值） */
export function valueToText(node) {
  return node.type === 'object' || node.type === 'array'
    ? JSON.stringify(toPlain(node), null, 2)
    : node.type === 'string'
      ? node.value
      : String(node.value)
}

/** 还原节点子树为普通 JS 值 */
export function toPlain(node) {
  if (node.type === 'array') return node.children.map(toPlain)
  if (node.type === 'object') {
    const result = {}
    node.children.forEach((child) => {
      result[child.key] = toPlain(child)
    })
    return result
  }
  return node.value
}

/**
 * 收集深度不超过 maxDepth 的节点路径，用于初始展开
 * @param {object} root
 * @param {number} maxDepth 根节点 depth 为 0
 */
export function collectPathsUntilDepth(root, maxDepth) {
  const paths = []
  walkDepthFirst(root, (node) => {
    if (node.depth <= maxDepth) paths.push(node.path)
  })
  return paths
}

/** 全部容器节点的路径（用于「全部展开」） */
export function collectContainerPaths(root) {
  const paths = []
  walkDepthFirst(root, (node) => {
    if (node.children.length > 0) paths.push(node.path)
  })
  return paths
}

/**
 * 按当前展开集合摊平树为可见行
 * @param {object} root
 * @param {Set<string>|Array<string>} expanded 展开的节点 path 集合
 * @returns {Array<{node, hasChildren, expanded}>}
 */
export function flattenTree(root, expanded) {
  const expandedSet = expanded instanceof Set ? expanded : new Set(expanded)
  const rows = []

  function walk(node) {
    const hasChildren = node.children.length > 0
    const isExpanded = hasChildren && expandedSet.has(node.path)
    rows.push({ node, hasChildren, expanded: isExpanded })
    if (isExpanded) node.children.forEach(walk)
  }

  walk(root)
  return rows
}

/** 树统计信息（顶部概览用） */
export function summarizeTree(root) {
  let total = 0
  let leaves = 0
  let containers = 0
  let maxDepth = 0

  walkDepthFirst(root, (node) => {
    total += 1
    maxDepth = Math.max(maxDepth, node.depth)
    if (node.children.length > 0) containers += 1
    else leaves += 1
  })

  return { total, leaves, containers, maxDepth }
}

function walkDepthFirst(node, visit) {
  visit(node)
  node.children.forEach((child) => walkDepthFirst(child, visit))
}
