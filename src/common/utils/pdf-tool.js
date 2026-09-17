// ============================================================
// PDF 合并 / 拆分纯函数（依赖 pdf-lib，纯 JS，node 可测）
// ============================================================
import { PDFDocument } from 'pdf-lib'

/**
 * 合并多个 PDF（按传入顺序）
 * @param {(ArrayBuffer | Uint8Array)[]} buffers
 * @returns {Promise<Uint8Array>} 合并后的 PDF 字节
 */
export async function mergePdfs(buffers) {
  const list = buffers || []
  if (list.length === 0) throw new Error('请至少选择一个 PDF 文件')

  const out = await PDFDocument.create()
  for (const buffer of list) {
    const src = await PDFDocument.load(buffer, { ignoreEncryption: true })
    const pages = await out.copyPages(src, src.getPageIndices())
    for (const page of pages) out.addPage(page)
  }
  return out.save()
}

/**
 * 解析页码区间文本（1 起始、含端点），如 "1-3,5"
 * @param {string} text
 * @param {number} pageCount 用于越界校验
 * @returns {{ok:true, indices:number[]} | {ok:false, error:string}} indices 为 0 起始且升序去重
 */
export function parsePageRanges(text, pageCount) {
  const raw = String(text ?? '').trim()
  if (!raw) return { ok: false, error: '页码范围为空' }

  const seen = new Set()
  for (const part of raw.split(/[,，]/)) {
    const token = part.trim()
    if (!token) continue
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token)
    if (!match) return { ok: false, error: `片段「${token}」不是合法的页码（示例：3 或 1-5）` }

    const from = Number(match[1])
    const to = match[2] != null ? Number(match[2]) : from
    if (from < 1 || to > pageCount || from > to) {
      return { ok: false, error: `片段「${token}」超出范围（共 ${pageCount} 页）` }
    }
    for (let page = from; page <= to; page++) seen.add(page - 1)
  }

  if (seen.size === 0) return { ok: false, error: '没有可提取的页面' }
  return { ok: true, indices: [...seen].sort((a, b) => a - b) }
}

/**
 * 按区间提取页面生成新 PDF
 * @param {ArrayBuffer | Uint8Array} buffer 源 PDF
 * @param {string} rangesText 页码区间文本（1 起始，如 "1-3,5"）
 * @returns {Promise<Uint8Array>}
 */
export async function extractPdfPages(buffer, rangesText) {
  const src = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const parsed = parsePageRanges(rangesText, src.getPageCount())
  if (!parsed.ok) throw new Error(parsed.error)

  const out = await PDFDocument.create()
  const pages = await out.copyPages(src, parsed.indices)
  for (const page of pages) out.addPage(page)
  return out.save()
}

/** 读取 PDF 页数（加载失败抛错，由页面捕获展示） */
export async function getPdfPageCount(buffer) {
  const src = await PDFDocument.load(buffer, { ignoreEncryption: true })
  return src.getPageCount()
}
