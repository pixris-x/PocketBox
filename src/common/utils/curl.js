// ============================================================
// cURL 命令解析与代码生成纯函数
//   解析支持：-X / -H / -d(-‑data*) / -u / -b / -A / -e / -F / -I / -G
//             行尾 \ 续行、单双引号、--flag=value 写法
//   生成支持：fetch / axios / Python requests / 规范化 curl
// 注意：不识别 shell 变量、命令替换与管道——本工具面向「粘贴一条请求」的场景。
// ============================================================

/** 会把下一个 token 当作参数的旗标 */
const VALUE_FLAGS = new Set([
  '-X',
  '--request',
  '-H',
  '--header',
  '-d',
  '--data',
  '--data-raw',
  '--data-binary',
  '--data-urlencode',
  '-u',
  '--user',
  '-b',
  '--cookie',
  '-A',
  '--user-agent',
  '-e',
  '--referer',
  '-F',
  '--form',
  '-o',
  '--output',
  '-x',
  '--proxy',
  '-m',
  '--max-time',
  '--connect-timeout',
  '-T',
  '--upload-file',
  '--url',
  '-w',
  '--write-out',
])

/**
 * 解析 cURL 命令
 * @param {string} command
 * @returns {{ok:true, request:object} | {ok:false, error:string}}
 */
export function parseCurl(command) {
  const raw = String(command ?? '').trim()
  if (!raw) return { ok: false, error: '命令为空' }

  const tokens = tokenize(raw)
  if (tokens.length === 0) return { ok: false, error: '命令为空' }

  let start = 0
  if (/^curl(\.exe)?$/i.test(tokens[0]) || /^\$/.test(tokens[0])) start = 1

  const request = {
    method: null,
    url: null,
    headers: [],
    body: null,
    user: null,
    cookies: null,
    form: [],
    useQuery: false,
    insecure: false,
    followRedirects: false,
  }

  for (let i = start; i < tokens.length; i++) {
    const token = tokens[i]
    if (!token.startsWith('-') || token === '-') {
      if (!request.url) request.url = token
      continue
    }

    const eqIndex = token.startsWith('--') ? token.indexOf('=') : -1
    const flag = eqIndex === -1 ? token : token.slice(0, eqIndex)
    let value = eqIndex === -1 ? null : token.slice(eqIndex + 1)
    if (value == null && VALUE_FLAGS.has(flag)) {
      value = tokens[++i] ?? null
      if (value == null) return { ok: false, error: `旗标 ${flag} 缺少参数` }
    }

    const applied = applyFlag(request, flag, value)
    if (!applied.ok) return applied
  }

  if (!request.url) return { ok: false, error: '没有找到 URL' }
  if (!/^https?:\/\//i.test(request.url)) {
    return { ok: false, error: '仅支持 http / https 开头的 URL' }
  }
  if (!request.method) {
    request.method = request.body || request.form.length ? 'POST' : 'GET'
  }
  return { ok: true, request }
}

function applyFlag(request, flag, value) {
  switch (flag) {
    case '-X':
    case '--request':
      request.method = String(value).toUpperCase()
      return { ok: true }
    case '-H':
    case '--header': {
      const text = String(value)
      const index = text.indexOf(':')
      if (index === -1) {
        request.headers.push({ name: text.replace(/;$/, '').trim(), value: '' })
      } else {
        request.headers.push({
          name: text.slice(0, index).trim(),
          value: text.slice(index + 1).trim(),
        })
      }
      return { ok: true }
    }
    case '-d':
    case '--data':
    case '--data-raw':
    case '--data-binary':
    case '--data-urlencode':
      // 多个 -d 在 curl 中以 & 拼接
      request.body = request.body == null ? String(value) : `${request.body}&${value}`
      return { ok: true }
    case '-u':
    case '--user':
      request.user = String(value)
      return { ok: true }
    case '-b':
    case '--cookie':
      request.cookies = String(value)
      return { ok: true }
    case '-A':
    case '--user-agent':
      request.headers.push({ name: 'User-Agent', value: String(value) })
      return { ok: true }
    case '-e':
    case '--referer':
      request.headers.push({ name: 'Referer', value: String(value) })
      return { ok: true }
    case '-F':
    case '--form': {
      const text = String(value)
      const index = text.indexOf('=')
      request.form.push({
        name: index === -1 ? text : text.slice(0, index),
        value: index === -1 ? '' : text.slice(index + 1),
      })
      return { ok: true }
    }
    case '-I':
    case '--head':
      request.method = 'HEAD'
      return { ok: true }
    case '-G':
    case '--get':
      request.useQuery = true
      request.method = 'GET'
      return { ok: true }
    case '-k':
    case '--insecure':
      request.insecure = true
      return { ok: true }
    case '-L':
    case '--location':
      request.followRedirects = true
      return { ok: true }
    default:
      // 其余旗标（-s / -v / -o / --compressed 等）对代码生成无影响，忽略
      return { ok: true }
  }
}

/** shell 词法切分：支持 \ 续行、单引号原样、双引号内 \" \\ 转义 */
export function tokenize(command) {
  const text = String(command).replace(/\\\r?\n/g, ' ')
  const tokens = []
  let current = ''
  let hasToken = false
  let quote = null

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quote === "'") {
      if (char === "'") quote = null
      else current += char
      continue
    }
    if (quote === '"') {
      if (char === '"') {
        quote = null
        continue
      }
      if (char === '\\' && /["\\$`]/.test(text[i + 1] ?? '')) {
        current += text[++i]
        continue
      }
      current += char
      continue
    }
    if (char === "'" || char === '"') {
      quote = char
      hasToken = true
      continue
    }
    if (/\s/.test(char)) {
      if (hasToken) {
        tokens.push(current)
        current = ''
        hasToken = false
      }
      continue
    }
    if (char === '\\' && i + 1 < text.length) {
      current += text[++i]
      hasToken = true
      continue
    }
    current += char
    hasToken = true
  }
  if (hasToken) tokens.push(current)
  return tokens
}

/** 请求对象 → 便于生成的中间结构（统一补出 Basic / Cookie 头） */
export function normalizeRequest(request) {
  const headers = request.headers.map((h) => ({ ...h }))

  if (request.user && !headers.some((h) => h.name.toLowerCase() === 'authorization')) {
    headers.push({ name: 'Authorization', value: `Basic ${base64(request.user)}` })
  }
  if (request.cookies && !headers.some((h) => h.name.toLowerCase() === 'cookie')) {
    headers.push({ name: 'Cookie', value: request.cookies })
  }

  const contentType = headers.find((h) => h.name.toLowerCase() === 'content-type')
  return {
    method: request.method || 'GET',
    url: request.url,
    headers,
    body: request.body,
    form: request.form || [],
    isJson: Boolean(contentType && /json/i.test(contentType.value)),
  }
}

/** UTF-8 安全的 Base64（浏览器与 node 18+ 都有全局 btoa） */
function base64(text) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function escapeQuote(text, quote) {
  return String(text).replaceAll('\\', '\\\\').replaceAll(quote, `\\${quote}`)
}

/** 生成 fetch 代码 */
export function toFetch(request, { indent = 2 } = {}) {
  const req = normalizeRequest(request)
  const pad = ' '.repeat(indent)
  const lines = [`fetch('${escapeQuote(req.url, "'")}', {`]
  if (req.method !== 'GET') lines.push(`${pad}method: '${req.method}',`)
  if (req.headers.length) {
    lines.push(`${pad}headers: {`)
    for (const h of req.headers) {
      lines.push(`${pad}${pad}'${escapeQuote(h.name, "'")}': '${escapeQuote(h.value, "'")}',`)
    }
    lines.push(`${pad}},`)
  }
  if (req.body) lines.push(`${pad}body: ${jsLiteral(req.body)},`)
  lines.push('})')
  return lines.join('\n')
}

/** 生成 axios 代码 */
export function toAxios(request, { indent = 2 } = {}) {
  const req = normalizeRequest(request)
  const pad = ' '.repeat(indent)
  const lines = [
    'axios({',
    `${pad}method: '${req.method.toLowerCase()}',`,
    `${pad}url: '${escapeQuote(req.url, "'")}',`,
  ]
  if (req.headers.length) {
    lines.push(`${pad}headers: {`)
    for (const h of req.headers) {
      lines.push(`${pad}${pad}'${escapeQuote(h.name, "'")}': '${escapeQuote(h.value, "'")}',`)
    }
    lines.push(`${pad}},`)
  }
  if (req.body) lines.push(`${pad}data: ${jsLiteral(req.body)},`)
  lines.push('})')
  return lines.join('\n')
}

/** JSON 串尝试还原为对象字面量，便于阅读；失败则原样输出字符串 */
function jsLiteral(text) {
  const value = String(text)
  try {
    const parsed = JSON.parse(value)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return `'${escapeQuote(value, "'")}'`
  }
}

/** 生成 Python requests 代码 */
export function toPython(request, { indent = 4 } = {}) {
  const req = normalizeRequest(request)
  const pad = ' '.repeat(indent)
  const lines = ['import requests', '', `url = '${escapeQuote(req.url, "'")}'`]

  if (req.headers.length) {
    lines.push('headers = {')
    for (const h of req.headers) {
      lines.push(`${pad}'${escapeQuote(h.name, "'")}': '${escapeQuote(h.value, "'")}',`)
    }
    lines.push('}')
  }
  if (req.body) lines.push(`payload = ${pyLiteral(req.body, pad)}`)

  const args = ['url']
  if (req.headers.length) args.push('headers=headers')
  if (req.body) args.push(req.isJson ? 'json=payload' : 'data=payload')
  lines.push(
    '',
    `response = requests.${req.method.toLowerCase()}(${args.join(', ')})`,
    'print(response.text)'
  )
  return lines.join('\n')
}

function pyLiteral(text, pad) {
  const value = String(text)
  try {
    const parsed = JSON.parse(value)
    return toPythonValue(parsed, pad)
  } catch {
    return `'${escapeQuote(value, "'")}'`
  }
}

function toPythonValue(value, pad) {
  if (value === null) return 'None'
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return `'${escapeQuote(value, "'")}'`
  if (Array.isArray(value)) {
    const inner = value.map((item) => toPythonValue(item, pad))
    return `[${inner.join(', ')}]`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).map(
      ([key, item]) => `'${escapeQuote(key, "'")}': ${toPythonValue(item, pad)}`
    )
    if (entries.length === 0) return '{}'
    const innerPad = `${pad}${pad}`
    return `{\n${innerPad}${entries.join(`,\n${innerPad}`)},\n${pad}}`
  }
  return 'None'
}

/** 生成规范化 curl（可再被 parseCurl 解析） */
export function toCurl(request) {
  const req = normalizeRequest(request)
  const parts = [`curl -X ${req.method}`]
  for (const h of req.headers) {
    parts.push(`  -H '${escapeQuote(h.name, "'")}: ${escapeQuote(h.value, "'")}'`)
  }
  if (req.body) parts.push(`  -d '${escapeQuote(req.body, "'")}'`)
  parts.push(`  '${escapeQuote(req.url, "'")}'`)
  return parts.join(' \\\n')
}

/** 生成 FormData 骨架（-F / --form 场景，浏览器端无法直接读本地文件） */
export function toFetchFormData(request) {
  const req = normalizeRequest(request)
  const lines = ['const form = new FormData()']
  for (const field of req.form) {
    lines.push(`form.append('${escapeQuote(field.name, "'")}', '${escapeQuote(field.value, "'")}')`)
  }
  lines.push('')
  lines.push(`fetch('${escapeQuote(req.url, "'")}', {`)
  lines.push(`  method: '${req.method}',`)
  // FormData 会自带 multipart boundary，手动写的 Content-Type 反而会破坏请求
  const headers = req.headers.filter((h) => h.name.toLowerCase() !== 'content-type')
  if (headers.length) {
    lines.push('  headers: {')
    for (const h of headers) {
      lines.push(`    '${escapeQuote(h.name, "'")}': '${escapeQuote(h.value, "'")}',`)
    }
    lines.push('  },')
  }
  lines.push('  body: form,')
  lines.push('})')
  return lines.join('\n')
}
