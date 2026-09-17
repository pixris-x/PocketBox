// ============================================================
// 二维码解码：图片 → canvas 像素 → jsQR，纯本地计算
// 大图先等比缩到最长边 1200px（jsQR 复杂度随像素数增长，缩放更快且不损识别率）
// ============================================================
import jsQR from 'jsqr'

const MAX_SIDE = 1200

/**
 * @param {File} file 图片文件
 * @returns {Promise<{text: string, version: number, width: number, height: number} | null>}
 *          未识别到二维码返回 null
 */
export async function decodeQrImage(file) {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('当前浏览器不支持 Canvas')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const image = ctx.getImageData(0, 0, width, height)
    const code = jsQR(image.data, width, height)
    if (!code) return null
    return { text: code.data, version: code.version, width, height }
  } finally {
    bitmap.close()
  }
}
