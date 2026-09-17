// ============================================================
// Favicon 生成：原图 → 多尺寸 PNG（canvas 缩放）→ 打包 .ico
// ============================================================
import { buildIco } from '@/common/utils/ico'

/** 生成单个尺寸的 PNG Blob */
async function renderPng(bitmap, size) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器不支持 Canvas')
  // cover 式居中裁剪为正方形，避免图标变形
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`生成 ${size}px 失败`))),
      'image/png'
    )
  })
}

/**
 * 生成全部尺寸的 PNG
 * @param {File} file
 * @param {number[]} sizes
 * @returns {Promise<{size:number, blob:Blob}[]>}
 */
export async function generateFavicons(file, sizes) {
  const bitmap = await createImageBitmap(file)
  try {
    const results = []
    for (const size of sizes) {
      results.push({ size, blob: await renderPng(bitmap, size) })
    }
    return results
  } finally {
    bitmap.close()
  }
}

/**
 * 把 16/32/48 三个 PNG 打包为 favicon.ico
 * @param {{size:number, blob:Blob}[]} favicons
 * @returns {Promise<Blob>}
 */
export async function packIco(favicons) {
  const wanted = [16, 32, 48]
  const entries = []
  for (const size of wanted) {
    const found = favicons.find((f) => f.size === size)
    if (!found) throw new Error(`缺少 ${size}px 尺寸，无法打包 ICO`)
    entries.push({ size, png: await found.blob.arrayBuffer() })
  }
  const bytes = buildIco(entries)
  return new Blob([bytes], { type: 'image/x-icon' })
}

/** 复制用的 HTML 引用代码 */
export function faviconHtmlSnippet() {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="48x48" />',
    '<link rel="icon" href="/favicon-192.png" type="image/png" sizes="192x192" />',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
  ].join('\n')
}
