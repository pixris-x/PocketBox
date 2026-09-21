// ============================================================
// 图片格式转换逻辑（页面专属脚本）
// 基于 Canvas：加载图片 → 按设置绘制 → toBlob 导出
// loadImage / drawToCanvas / canvasToBlob 属同页公共基建，见 ../../../scripts/canvas
// ============================================================

export { canvasToBlob, drawToCanvas, loadImage } from '../../../scripts/canvas'

export const FORMATS = [
  { value: 'png', label: 'PNG', mime: 'image/png', lossy: false },
  { value: 'jpeg', label: 'JPEG', mime: 'image/jpeg', lossy: true },
  { value: 'webp', label: 'WebP', mime: 'image/webp', lossy: true },
]

export function mimeFor(format) {
  const found = FORMATS.find((item) => item.value === format)
  return found ? found.mime : 'image/png'
}

/** 根据文件名推导默认导出格式 */
export function formatFromFilename(filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'png'
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg'
  if (ext === 'webp') return 'webp'
  return 'png'
}
