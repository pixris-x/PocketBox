// JSON 工具：校验 / 格式化 / 压缩
/**
 * 解析 JSON，失败时抛出带行列信息的错误
 * @param {string} text
 * @returns {any}
 * @throws {Error} 带位置提示的错误
 */
export function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch (err) {
    // 从原生错误中提取位置（'at position N' 或 'at line N column M'）
    const msg = err instanceof Error ? err.message : String(err)
    const posMatch = /position (\d+)/.exec(msg)
    const lineColMatch = /line (\d+) column (\d+)/.exec(msg)
    if (lineColMatch) {
      throw new Error(`JSON 解析失败：第 ${lineColMatch[1]} 行，第 ${lineColMatch[2]} 列`, {
        cause: err,
      })
    }
    if (posMatch) {
      const pos = Number(posMatch[1])
      const before = text.slice(0, pos)
      const line = before.split('\n').length
      const col = pos - before.lastIndexOf('\n')
      throw new Error(`JSON 解析失败：第 ${line} 行，第 ${col} 列`, { cause: err })
    }
    throw new Error(`JSON 解析失败：${msg}`, { cause: err })
  }
}

/** 格式化：默认按 2 空格缩进 */
export function formatJson(text, { indent = 2, sortKeys = false } = {}) {
  const value = parseJson(text)
  return JSON.stringify(
    value,
    sortKeys
      ? (_, val) => (val && typeof val === 'object' && !Array.isArray(val) ? sortObject(val) : val)
      : null,
    indent
  )
}

/** 压缩为单行（紧凑）JSON */
export function minifyJson(text) {
  return JSON.stringify(parseJson(text))
}

function sortObject(obj) {
  const sorted = {}
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = obj[key]
    })
  return sorted
}
