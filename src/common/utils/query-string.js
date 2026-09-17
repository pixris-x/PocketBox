// ============================================================
// 查询串（query string）解析纯函数
//   - 输入容忍度高：完整 URL / 带 ? 的查询串 / 裸的 a=1&b=2 均可
//   - 与 URL 编码工具互补：这里按「结构」拆解，不做整体编解码
// ============================================================

/**
 * 解析查询串
 * @param {string} input 完整 URL 或查询串
 * @returns {{ok:true, pairs:{key:string,value:string}[], count:number} | {ok:false, error:string}}
 */
export function parseQuery(input) {
  const raw = String(input ?? '').trim()
  if (!raw) return { ok: false, error: '输入为空' }

  let query = raw
  let base = ''
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    // 完整 URL：取 search，记录前缀供展示
    const qIndex = raw.indexOf('?')
    const hashIndex = raw.indexOf('#')
    if (qIndex === -1) {
      base = raw
      query = ''
    } else {
      const end = hashIndex !== -1 && hashIndex > qIndex ? hashIndex : raw.length
      base = raw.slice(0, qIndex)
      query = raw.slice(qIndex + 1, end)
    }
  } else if (raw.startsWith('?')) {
    query = raw.slice(1)
  }

  if (query === '') {
    return { ok: true, pairs: [], count: 0 }
  }

  const pairs = []
  for (const part of query.split('&')) {
    if (part === '') continue
    const eq = part.indexOf('=')
    // 无 = 的片段视为「值为空」的键（如 ?flag）
    const rawKey = eq === -1 ? part : part.slice(0, eq)
    const rawValue = eq === -1 ? '' : part.slice(eq + 1)
    const key = safeDecode(rawKey)
    const value = safeDecode(rawValue)
    if (key == null || value == null) {
      return { ok: false, error: `片段「${part}」含有无效的百分号编码（如孤立的 %）` }
    }
    pairs.push({ key, value })
  }
  return { ok: true, pairs, count: pairs.length, base }
}

/**
 * 把键值对重新序列化为查询串（键与值都做 encodeURIComponent）
 * @param {{key:string,value:string}[]} pairs
 * @param {boolean} [withQuestionMark=true]
 */
export function buildQuery(pairs, withQuestionMark = true) {
  const parts = (pairs || []).map(({ key, value }) => {
    const k = encodeURIComponent(String(key ?? ''))
    const v = encodeURIComponent(String(value ?? ''))
    return v === '' ? k : `${k}=${v}`
  })
  const joined = parts.join('&')
  return withQuestionMark && joined ? `?${joined}` : joined
}

function safeDecode(text) {
  try {
    return decodeURIComponent(text.replace(/\+/g, ' '))
  } catch {
    return null
  }
}
