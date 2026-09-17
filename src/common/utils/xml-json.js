// ============================================================
// XML ↔ JSON 互转纯函数（零依赖，自写精简 XML 解析器）
//   约定（xml2js 风格）：
//   - 属性 → '@attr' 键；文本内容：元素只有文本时直接作为值，
//     与子元素混合时放 '#text'；重复的兄弟元素 → 数组
//   - 解析器覆盖：声明/注释/DOCTYPE 跳过、自闭合、属性、CDATA、基本实体
//   - 不支持：命名空间前缀（原样保留为键名）、XML 校验（不校验 DTD）
// ============================================================

const ENTITIES = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
}

/**
 * XML 文本 → JS 结构
 * @returns {{ok:true, data:object} | {ok:false, error:string}}
 */
export function xmlToJson(xml) {
  try {
    return { ok: true, data: parseDocument(String(xml ?? '')) }
  } catch (error) {
    return { ok: false, error: error.message }
  }
}

/**
 * JS 结构 → XML 文本
 * @param {object} data
 * @param {{rootName?: string, indent?: number, declaration?: boolean}} [options]
 */
export function jsonToXml(data, { rootName = 'root', indent = 2, declaration = true } = {}) {
  const pad = indent > 0 ? ' '.repeat(indent) : ''
  const lines = []
  if (declaration) lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push(serializeNode(rootName, data, 0, pad, indent))
  return lines.join(indent > 0 ? '\n' : '')
}

// ---------- 解析 ----------

function parseDocument(xml) {
  const body = stripInert(xml)
  const root = parseContent(body)
  if (!root) throw new Error('未找到 XML 根元素')
  return root.value
}

/** 去掉声明 / 注释 / DOCTYPE / 处理指令（CDATA 之前统一处理，忽略其在 CDATA 内的情况——此处场景可接受） */
function stripInert(xml) {
  return xml
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
}

function parseContent(xml) {
  const tagMatch = /^<([^\s/>]+)((?:\s+[^=<>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/.exec(xml)
  if (!tagMatch) throw new Error('XML 格式错误：找不到合法的开始标签')

  const [, name, attrText, selfClosing] = tagMatch
  const node = {}
  for (const attr of parseAttributes(attrText)) {
    node[`@${attr.name}`] = attr.value
  }

  if (selfClosing) {
    return { value: node, rest: xml.slice(tagMatch[0].length) }
  }

  let rest = xml.slice(tagMatch[0].length)
  const textParts = []
  const children = {}

  while (rest.length > 0) {
    if (rest.startsWith('</')) {
      const closeMatch = /^<\/\s*([^>]+)>/.exec(rest)
      if (!closeMatch || closeMatch[1].trim() !== name) {
        throw new Error(`XML 格式错误：标签 <${name}> 未正确闭合`)
      }
      rest = rest.slice(closeMatch[0].length)
      const text = textParts.join('').trim()
      const childKeys = Object.keys(children)
      let value
      if (childKeys.length === 0) {
        if (Object.keys(node).length === 0) {
          value = text // 只有文本（无属性无子元素）：值就是字符串
        } else {
          if (text !== '') node['#text'] = text
          value = node
        }
      } else {
        for (const [key, val] of Object.entries(children)) node[key] = val
        if (text !== '') node['#text'] = text
        value = node
      }
      return { value, rest }
    }
    if (rest.startsWith('<![CDATA[')) {
      const end = rest.indexOf(']]>')
      if (end === -1) throw new Error('XML 格式错误：CDATA 未闭合')
      textParts.push(rest.slice(9, end))
      rest = rest.slice(end + 3)
      continue
    }
    if (rest.startsWith('<')) {
      const child = parseContent(rest)
      const childName = /^<([^\s/>]+)/.exec(rest)[1]
      pushChild(children, childName, child.value)
      rest = child.rest
      continue
    }
    const nextTag = rest.indexOf('<')
    const chunk = nextTag === -1 ? rest : rest.slice(0, nextTag)
    textParts.push(decodeEntities(chunk))
    rest = nextTag === -1 ? '' : rest.slice(nextTag)
  }
  throw new Error(`XML 格式错误：标签 <${name}> 缺少闭合`)
}

function parseAttributes(attrText) {
  const attrs = []
  const pattern = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  let match
  while ((match = pattern.exec(attrText))) {
    attrs.push({ name: match[1], value: decodeEntities(match[2] ?? match[3] ?? '') })
  }
  return attrs
}

function pushChild(children, name, value) {
  if (Array.isArray(children[name])) {
    children[name].push(value)
  } else if (name in children) {
    children[name] = [children[name], value]
  } else {
    children[name] = value
  }
}

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&(lt|gt|amp|quot|apos);/g, (_, name) => ENTITIES[name])
}

// ---------- 序列化 ----------

function serializeNode(name, value, depth, pad, indent) {
  const currentPad = pad.repeat(depth)
  const childPad = pad.repeat(depth + 1)
  const newline = indent > 0 ? '\n' : ''

  if (value == null || typeof value !== 'object') {
    const text = escapeText(value == null ? '' : String(value))
    return `${currentPad}<${name}>${text}</${name}>`
  }

  const attrText = Object.entries(value)
    .filter(([key]) => key.startsWith('@'))
    .map(([key, val]) => ` ${key.slice(1)}="${escapeText(String(val))}"`)
    .join('')

  const entries = Object.entries(value).filter(([key]) => !key.startsWith('@'))
  const textEntry = entries.find(([key]) => key === '#text')
  const childEntries = entries.filter(([key]) => key !== '#text')

  if (childEntries.length === 0) {
    const text = escapeText(textEntry ? String(textEntry[1]) : '')
    return `${currentPad}<${name}${attrText}>${text}</${name}>`
  }

  const inner = []
  if (textEntry) {
    inner.push(`${childPad}${escapeText(String(textEntry[1]))}`)
  }
  for (const [key, val] of childEntries) {
    if (Array.isArray(val)) {
      for (const item of val) inner.push(serializeNode(key, item, depth + 1, pad, indent))
    } else {
      inner.push(serializeNode(key, val, depth + 1, pad, indent))
    }
  }
  return `${currentPad}<${name}${attrText}>${newline}${inner.join(newline)}${newline}${currentPad}</${name}>`
}

function escapeText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
