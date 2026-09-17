// 二维码矩阵生成（页面私有逻辑）
// qrcode-generator 的 Byte 模式按字符码取字节，中文等 >255 的字符会出错，
// 因此先按 UTF-8 编码成字节串再喂给它（扫描器按 UTF-8 解码即可正确识别）
import qrcode from 'qrcode-generator'

function toByteString(text) {
  const bytes = new TextEncoder().encode(String(text ?? ''))
  let result = ''
  for (const byte of bytes) result += String.fromCharCode(byte)
  return result
}

/**
 * 生成二维码矩阵
 * @param {string} text 内容
 * @param {'L'|'M'|'Q'|'H'} level 纠错级别
 * @returns {{ count: number, isDark: (r: number, c: number) => boolean } | null}
 */
export function buildMatrix(text, level = 'M') {
  const content = String(text ?? '')
  if (!content) return null
  try {
    const qr = qrcode(0, level)
    qr.addData(toByteString(content), 'Byte')
    qr.make()
    return { count: qr.getModuleCount(), isDark: (r, c) => qr.isDark(r, c) }
  } catch {
    return undefined // 容量超限或生成失败
  }
}
