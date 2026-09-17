// ============================================================
// EXIF 页面专属逻辑：文件读取、canvas 重绘清洗导出、展示格式化
// 解析本体在 common/utils/exif.js（纯函数），这里只做文件与 UI 编排
// ============================================================

export function readArrayBuffer(file) {
  return file.arrayBuffer()
}

/**
 * 清除元数据：canvas 重绘只保留像素，天然剥离全部 EXIF / GPS / 缩略图。
 * 分辨率保持不变；JPEG/WebP 重编码质量 0.92，PNG 无损。
 * @returns {Promise<{blob: Blob, filename: string}>}
 */
export async function cleanImageFile(file, { quality = 0.92 } = {}) {
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('当前浏览器不支持 Canvas')
    ctx.drawImage(bitmap, 0, 0)
    const mime = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      ? file.type
      : 'image/jpeg'
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('导出失败'))), mime, quality)
    })
    const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
    const base = file.name.replace(/\.[^.]+$/, '') || 'image'
    return { blob, filename: `${base}-clean${extMap[mime]}` }
  } finally {
    bitmap.close()
  }
}

const ORIENTATION_TEXT = {
  1: '横向（正常）',
  2: '横向（镜像）',
  3: '旋转 180°',
  4: '纵向（镜像）',
  5: '转置',
  6: '顺时针旋转 90°',
  7: '转置横向',
  8: '逆时针旋转 90°',
}

export function describeOrientation(code) {
  return ORIENTATION_TEXT[code] || null
}

/** 快门速度：整秒显示小数，不足 1 秒显示分数 */
export function formatShutter(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null
  if (seconds >= 1) {
    const rounded = Number(seconds.toFixed(1))
    return `${rounded} s`
  }
  return `1/${Math.round(1 / seconds)} s`
}

/** 坐标格式化：保留 6 位小数（约 0.1m 精度） */
export function formatCoordinate(latitude, longitude) {
  if (latitude == null || longitude == null) return null
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
}
