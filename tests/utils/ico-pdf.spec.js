import { describe, it, expect } from 'vitest'
import { buildIco } from '@/common/utils/ico'
import { parsePageRanges, mergePdfs, extractPdfPages } from '@/common/utils/pdf-tool'
import { PDFDocument } from 'pdf-lib'

// ---------- buildIco（PNG 数据用任意字节模拟，只验证容器结构） ----------

function fakePng(length) {
  const bytes = new Uint8Array(length)
  bytes[0] = 0x89 // PNG 签名首字节，便于区分
  return bytes
}

describe('buildIco', () => {
  it('头部：保留 0 / 类型 1 / 图像数（小端）', () => {
    const ico = buildIco([
      { size: 16, png: fakePng(100) },
      { size: 32, png: fakePng(200) },
    ])
    const view = new DataView(ico.buffer)
    expect(view.getUint16(0, true)).toBe(0)
    expect(view.getUint16(2, true)).toBe(1)
    expect(view.getUint16(4, true)).toBe(2)
  })

  it('目录项：宽高字节 / 平面数 / 位深 / 数据长度与偏移正确', () => {
    const pngA = fakePng(100)
    const pngB = fakePng(200)
    const ico = buildIco([
      { size: 16, png: pngA },
      { size: 256, png: pngB },
    ])
    const view = new DataView(ico.buffer)

    const entryA = 6
    expect(view.getUint8(entryA)).toBe(16)
    expect(view.getUint8(entryA + 1)).toBe(16)
    expect(view.getUint16(entryA + 4, true)).toBe(1)
    expect(view.getUint16(entryA + 6, true)).toBe(32)
    expect(view.getUint32(entryA + 8, true)).toBe(100)
    expect(view.getUint32(entryA + 12, true)).toBe(6 + 2 * 16)

    const entryB = 6 + 16
    expect(view.getUint8(entryB)).toBe(0) // 256 用 0 表示
    expect(view.getUint32(entryB + 8, true)).toBe(200)
    expect(view.getUint32(entryB + 12, true)).toBe(6 + 2 * 16 + 100)
  })

  it('总长度 = 头部 + 各 PNG，PNG 字节原样落在各自偏移', () => {
    const pngA = fakePng(100)
    const pngB = fakePng(200)
    const ico = buildIco([
      { size: 16, png: pngA },
      { size: 48, png: pngB },
    ])
    expect(ico.length).toBe(6 + 2 * 16 + 100 + 200)
    expect(ico[6 + 32]).toBe(0x89)
    expect(ico[6 + 32 + 100]).toBe(0x89)
  })

  it('空数组抛错', () => {
    expect(() => buildIco([])).toThrow('至少需要一张')
  })
})

// ---------- parsePageRanges（纯解析，不依赖 PDF） ----------

describe('parsePageRanges', () => {
  it('单页 / 区间 / 混合，升序去重（0 起始）', () => {
    expect(parsePageRanges('5', 10)).toEqual({ ok: true, indices: [4] })
    expect(parsePageRanges('1-3', 10)).toEqual({ ok: true, indices: [0, 1, 2] })
    expect(parsePageRanges('5,1-3,2', 10)).toEqual({ ok: true, indices: [0, 1, 2, 4] })
  })

  it('容忍中文逗号与空格', () => {
    expect(parsePageRanges('1 - 3，5', 10)).toEqual({ ok: true, indices: [0, 1, 2, 4] })
  })

  it('越界 / 逆序 / 非法 / 空输入报中文错误', () => {
    expect(parsePageRanges('0', 10).error).toContain('超出范围')
    expect(parsePageRanges('11', 10).error).toContain('超出范围')
    expect(parsePageRanges('3-1', 10).error).toContain('超出范围')
    expect(parsePageRanges('a-b', 10).error).toContain('不是合法的页码')
    expect(parsePageRanges('', 10).error).toContain('为空')
  })
})

// ---------- mergePdfs / extractPdfPages（用 pdf-lib 现场构造最小 PDF） ----------

async function makePdf(pageCount) {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) doc.addPage([200, 300])
  return doc.save()
}

describe('mergePdfs / extractPdfPages', () => {
  it('合并两个 PDF：页数相加', async () => {
    const merged = await mergePdfs([await makePdf(2), await makePdf(3)])
    const doc = await PDFDocument.load(merged)
    expect(doc.getPageCount()).toBe(5)
  })

  it('单个文件合并等于原文件页数', async () => {
    const merged = await mergePdfs([await makePdf(1)])
    const doc = await PDFDocument.load(merged)
    expect(doc.getPageCount()).toBe(1)
  })

  it('空输入抛错', async () => {
    await expect(mergePdfs([])).rejects.toThrow('至少选择一个')
  })

  it('按区间提取页面：2→4 页取 [1-2] 得 2 页', async () => {
    const extracted = await extractPdfPages(await makePdf(4), '1-2')
    const doc = await PDFDocument.load(extracted)
    expect(doc.getPageCount()).toBe(2)
  })

  it('乱序去重区间：4 页取 "3,1,2" 得 3 页', async () => {
    const extracted = await extractPdfPages(await makePdf(4), '3,1,2')
    const doc = await PDFDocument.load(extracted)
    expect(doc.getPageCount()).toBe(3)
  })

  it('非法区间抛错', async () => {
    await expect(extractPdfPages(await makePdf(2), '5')).rejects.toThrow('超出范围')
  })
})
