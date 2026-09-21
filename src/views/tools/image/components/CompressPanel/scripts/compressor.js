// ============================================================
// 图片压缩逻辑（页面专属脚本）
// 输出只给有损格式：PNG 是无损编码，重压基本不会变小，给出来只会误导
// ============================================================
import { canvasToBlob, drawToCanvas } from '../../../scripts/canvas'

export const COMPRESS_FORMATS = [
  { value: 'webp', label: 'WebP（同画质体积最小）', mime: 'image/webp' },
  { value: 'jpeg', label: 'JPEG（兼容性最好，不保留透明）', mime: 'image/jpeg' },
]

export function mimeFor(format) {
  const found = COMPRESS_FORMATS.find((item) => item.value === format)
  return found ? found.mime : 'image/webp'
}

/** 该格式是否需要处理透明背景 */
export function fillsBackground(format) {
  return format === 'jpeg'
}

/**
 * 压缩单张已加载的图片
 * @param {HTMLImageElement} image
 * @param {{format?:string, quality?:number, maxWidth?:number, maxHeight?:number, fillBg?:boolean}} [options]
 * @returns {Promise<{blob: Blob, width: number, height: number}>}
 */
export async function compressImage(
  image,
  { format = 'webp', quality = 0.8, maxWidth = 0, maxHeight = 0, fillBg = true } = {}
) {
  const canvas = drawToCanvas(image, {
    maxWidth,
    maxHeight,
    bgColor: fillBg && fillsBackground(format) ? '#ffffff' : '',
  })
  const blob = await canvasToBlob(canvas, mimeFor(format), quality)
  return { blob, width: canvas.width, height: canvas.height }
}

/**
 * 体积变化：压缩有时反而变大（原图已是高熵 JPEG、或目标格式不合适），
 * savingPercent 会把这种情况夹到 0，表达不出「变大」，故单独计算并带上方向。
 * @param {number} original 原字节数
 * @param {number} compressed 压缩后字节数
 * @returns {{percent: number, grew: boolean}} percent 为变化幅度的绝对值
 */
export function sizeChange(original, compressed) {
  if (!Number.isFinite(original) || original <= 0) return { percent: 0, grew: false }
  const delta = compressed - original
  return { percent: Math.abs((delta / original) * 100), grew: delta > 0 }
}

/** 输出文件名主干：原主干 + 压缩后缀 + 新扩展名 */
export function outputFilename(filename, format) {
  const base = String(filename).replace(/\.[^.]+$/, '') || 'image'
  const ext = format === 'jpeg' ? 'jpg' : format
  return `${base}-compressed.${ext}`
}
