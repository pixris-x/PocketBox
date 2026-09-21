// ============================================================
// 图片工具箱页面共享的 Canvas 基建
// 供 ConvertPanel / CompressPanel 等多个子面板复用（§2.1：同页公共逻辑只留一份）
// 依赖 DOM，只能在浏览器里跑，因此不进 common/utils（那里要求纯函数 + node 可测）
// ============================================================

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
 *  maxWidth / maxHeight: 等比约束到不超过该像素（0 表示不限制）
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
