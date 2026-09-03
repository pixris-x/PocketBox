// MD5 摘要工具（基于 js-md5）
// 注意：MD5 仅用于校验/去重等场景，不应用于加密或安全用途
import md5 from 'js-md5'

/**
 * 文本 → MD5 hex
 * @param {string} text
 * @returns {string}
 */
export function hashText(text) {
  return md5(text)
}

/**
 * ArrayBuffer → MD5 hex
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
export function hashBuffer(buffer) {
  return md5.arrayBuffer(buffer)
}

/**
 * 文件 → MD5 hex（内部读取为 ArrayBuffer）
 * @param {Blob} file
 * @returns {Promise<string>}
 */
export async function hashFile(file) {
  const buffer = await file.arrayBuffer()
  return hashBuffer(buffer)
}
