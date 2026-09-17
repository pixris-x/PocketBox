// ============================================================
// ICO 容器封装纯函数（PNG-in-ICO，Vista+ 标准，浏览器全兼容）
// ICO 结构：ICONDIR(6B) + N × ICONDIRENTRY(16B) + 各 PNG 数据，全部小端
// ============================================================

/**
 * 把若干 PNG 打包为单个 .ico 文件
 * @param {{size: number, png: ArrayBuffer | Uint8Array}[]} images
 * @returns {Uint8Array}
 */
export function buildIco(images) {
  const list = (images || []).map(({ size, png }) => ({
    size,
    png: png instanceof Uint8Array ? png : new Uint8Array(png),
  }))
  if (list.length === 0) throw new Error('ICO 至少需要一张图')

  const headerSize = 6 + list.length * 16
  const total = headerSize + list.reduce((sum, item) => sum + item.png.length, 0)
  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)

  // ICONDIR：保留 0 / 类型 1（图标）/ 图像数
  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true)
  view.setUint16(4, list.length, true)

  let offset = headerSize
  list.forEach((item, index) => {
    const entry = 6 + index * 16
    // 宽高各 1 字节，256 用 0 表示
    view.setUint8(entry, item.size >= 256 ? 0 : item.size)
    view.setUint8(entry + 1, item.size >= 256 ? 0 : item.size)
    view.setUint8(entry + 2, 0) // 调色板色数（PNG 格式固定 0）
    view.setUint8(entry + 3, 0) // 保留
    view.setUint16(entry + 4, 1, true) // 颜色平面数
    view.setUint16(entry + 6, 32, true) // 位深
    view.setUint32(entry + 8, item.png.length, true)
    view.setUint32(entry + 12, offset, true)
    out.set(item.png, offset)
    offset += item.png.length
  })

  return out
}
