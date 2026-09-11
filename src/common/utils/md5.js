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
 * 注意：不要用 md5.arrayBuffer()，它返回的是原始摘要字节（ArrayBuffer），
 * 不是十六进制字符串，会被页面渲染成「[object ArrayBuffer]」。
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
export function hashBuffer(buffer) {
  return md5.hex(buffer)
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
