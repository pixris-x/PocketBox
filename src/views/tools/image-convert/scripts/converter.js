// ============================================================
// 图片格式转换逻辑（页面专属脚本）
// 基于 Canvas：加载图片 → 按设置绘制 → toBlob 导出
// ============================================================

export const FORMATS = [
  { value: 'png', label: 'PNG', mime: 'image/png', lossy: false },
  { value: 'jpeg', label: 'JPEG', mime: 'image/jpeg', lossy: true },
  { value: 'webp', label: 'WebP', mime: 'image/webp', lossy: true },
]

export function mimeFor(format) {
  const found = FORMATS.find((item) => item.value === format)
  return found ? found.mime : 'image/png'
}

/** 加载 File 为 HTMLImageElement（返回需要 revoke 的 object URL） */
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法解码该图片，请检查文件是否损坏或格式是否受支持'))
    }
    img.src = url
  })
}

/**
 * 将图片绘制到 Canvas 并返回
 * @param {HTMLImageElement} img
 * @param {{scale?:number, maxWidth?:number, maxHeight?:number, bgColor?:string}} [options]
 *  scale: 缩放百分比（0~100 表示目标为原图的百分比）
 *  bgColor: 背景填充色（如 JPEG 处理透明背景传 '#ffffff'）
 */
export function drawToCanvas(img, { scale = 100, maxWidth = 0, maxHeight = 0, bgColor = '' } = {}) {
  let width = img.naturalWidth
  let height = img.naturalHeight

  if (scale !== 100 && scale > 0) {
    const ratio = scale / 100
    width = Math.max(1, Math.round(width * ratio))
    height = Math.max(1, Math.round(height * ratio))
  }
  if (maxWidth > 0 && width > maxWidth) {
    height = Math.max(1, Math.round((height * maxWidth) / width))
    width = maxWidth
  }
  if (maxHeight > 0 && height > maxHeight) {
    width = Math.max(1, Math.round((width * maxHeight) / height))
    height = maxHeight
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (bgColor) {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(img, 0, 0, width, height)
  return canvas
}

/** Canvas → Blob */
export function canvasToBlob(canvas, mime, quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('转换失败：当前浏览器可能不支持该格式'))),
      mime,
      quality
    )
  })
}

/** 根据文件名推导默认导出格式 */
export function formatFromFilename(filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'png'
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg'
  if (ext === 'webp') return 'webp'
  return 'png'
}
