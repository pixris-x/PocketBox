// ============================================================
// Markdown 渲染纯函数（依赖 marked）
//   安全提示：marked 会原样输出内联 HTML，预览一律放在 sandbox iframe 中渲染
//   （见 buildPreviewDocument），不直接插入主文档，避免脚本执行。
// ============================================================
import { marked } from 'marked'

/**
 * Markdown → HTML 片段
 * @param {string} text
 * @param {{gfm?: boolean, breaks?: boolean}} [options]
 * @returns {{ok:true, html:string} | {ok:false, error:string}}
 */
export function renderMarkdown(text, { gfm = true, breaks = true } = {}) {
  const source = String(text ?? '')
  try {
    const html = marked.parse(source, { gfm, breaks, async: false })
    return { ok: true, html: String(html) }
  } catch (error) {
    return { ok: false, error: `Markdown 渲染失败：${error?.message || error}` }
  }
}

/**
 * 生成预览用完整文档（供 iframe srcdoc 使用）
 * @param {string} html 渲染后的 HTML 片段
 * @param {{dark?: boolean, forPrint?: boolean}} [options]
 *   forPrint=true 时附带打印样式（A4 页边距、去背景、链接可见），供「导出 PDF」使用
 * @returns {string}
 */
export function buildPreviewDocument(html, { dark = false, forPrint = false } = {}) {
  const palette = dark
    ? { bg: '#232326', fg: '#e4e4e7', muted: '#a1a1aa', border: '#3f3f46', soft: '#2b2b2f' }
    : { bg: '#ffffff', fg: '#27272a', muted: '#71717a', border: '#e4e4e7', soft: '#f6f6f7' }

  const printStyles = forPrint
    ? `
  @page { size: A4; margin: 16mm 15mm; }
  @media print {
    body { padding: 0; background: #ffffff; color: #000000; }
    a { color: #000000; text-decoration: underline; }
    pre, blockquote, table, img { break-inside: avoid; }
    h1, h2, h3 { break-after: avoid; }
    code { background: #f2f2f2; }
  }`
    : ''

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8" /><style>
  body { margin: 0; padding: 20px 22px; background: ${palette.bg}; color: ${palette.fg};
         font: 15px/1.75 -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
         word-wrap: break-word; }
  h1, h2, h3, h4 { line-height: 1.35; margin: 1.4em 0 0.6em; font-weight: 600; }
  h1 { font-size: 1.7em; border-bottom: 1px solid ${palette.border}; padding-bottom: 0.3em; }
  h2 { font-size: 1.35em; border-bottom: 1px solid ${palette.border}; padding-bottom: 0.25em; }
  h3 { font-size: 1.15em; }
  p { margin: 0.7em 0; }
  a { color: #f97316; }
  code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 0.9em;
         background: ${palette.soft}; padding: 0.15em 0.4em; border-radius: 4px; }
  pre { background: ${palette.soft}; border: 1px solid ${palette.border}; border-radius: 8px;
        padding: 12px 14px; overflow: auto; }
  pre code { background: none; padding: 0; }
  blockquote { margin: 0.8em 0; padding: 0.2em 1em; border-left: 3px solid ${palette.border};
               color: ${palette.muted}; }
  table { border-collapse: collapse; margin: 0.8em 0; }
  th, td { border: 1px solid ${palette.border}; padding: 6px 10px; }
  th { background: ${palette.soft}; }
  img { max-width: 100%; }
  hr { border: none; border-top: 1px solid ${palette.border}; margin: 1.6em 0; }
  ul, ol { padding-left: 1.6em; }${printStyles}
</style></head><body>
${html}
</body></html>`
}
