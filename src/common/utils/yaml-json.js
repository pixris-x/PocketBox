// ============================================================
// YAML ↔ JSON 互转纯函数（依赖 js-yaml v5，纯 ESM 命名导出）
// ============================================================
import { dump, load } from 'js-yaml'

/**
 * YAML → JS 对象
 * @param {string} text
 * @returns {{ok:true, value:unknown} | {ok:false, error:string}}
 */
export function yamlToJson(text) {
  const source = String(text ?? '')
  if (!source.trim()) return { ok: false, error: '输入为空' }
  try {
    return { ok: true, value: load(source) }
  } catch (error) {
    return { ok: false, error: `YAML 解析失败：${cleanMessage(error)}` }
  }
}

/**
 * JSON 文本（或对象）→ YAML
 * @param {string | unknown} input
 * @returns {{ok:true, text:string} | {ok:false, error:string}}
 */
export function jsonToYaml(input) {
  let value = input
  if (typeof input === 'string') {
    if (!input.trim()) return { ok: false, error: '输入为空' }
    try {
      value = JSON.parse(input)
    } catch (error) {
      return { ok: false, error: `JSON 解析失败：${cleanMessage(error)}` }
    }
  }
  try {
    // lineWidth -1：不要为了折行破坏长字符串（如 base64、URL）
    const text = dump(value, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false })
    return { ok: true, text: text.trimEnd() }
  } catch (error) {
    return { ok: false, error: `YAML 生成失败：${cleanMessage(error)}` }
  }
}

/** js-yaml 的错误信息带位置与代码片段，压缩成单行，便于界面展示 */
function cleanMessage(error) {
  return String(error?.message || error)
    .split('\n')[0]
    .replace(/^YAMLException:\s*/, '')
}
