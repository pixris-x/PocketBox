import { describe, it, expect } from 'vitest'
import { renderMarkdown, buildPreviewDocument } from '@/common/utils/markdown'

describe('renderMarkdown', () => {
  it('渲染标题 / 列表 / 代码块 / 表格（GFM）', () => {
    const md = ['# 标题', '', '- a', '- b', '', '| x | y |', '| - | - |', '| 1 | 2 |'].join('\n')
    const result = renderMarkdown(md)
    expect(result.ok).toBe(true)
    expect(result.html).toContain('<h1>标题</h1>')
    expect(result.html).toContain('<li>a</li>')
    expect(result.html).toContain('<table>')
  })

  it('代码块与行内代码', () => {
    const result = renderMarkdown('```js\nconst a = 1\n```\n\n行内 `code`')
    expect(result.html).toContain('<pre>')
    expect(result.html).toContain('<code class="language-js">')
    expect(result.html).toContain('<code>code</code>')
  })

  it('breaks=true 时单个换行也成段内换行', () => {
    expect(renderMarkdown('第一行\n第二行').html).toContain('<br>')
    expect(renderMarkdown('第一行\n第二行', { breaks: false }).html).not.toContain('<br>')
  })

  it('空输入与非法输入不抛异常', () => {
    expect(renderMarkdown('')).toEqual({ ok: true, html: '' })
    expect(renderMarkdown(null).ok).toBe(true)
    expect(renderMarkdown(undefined).ok).toBe(true)
  })

  it('内联 HTML 原样输出（安全边界由 sandbox iframe 承担，见 buildPreviewDocument）', () => {
    const result = renderMarkdown('<div class="x">hi</div>')
    expect(result.html).toContain('<div class="x">hi</div>')
  })
})

describe('buildPreviewDocument', () => {
  it('生成完整文档并内联基础排版样式', () => {
    const doc = buildPreviewDocument('<h1>标题</h1>')
    expect(doc.startsWith('<!doctype html>')).toBe(true)
    expect(doc).toContain('<h1>标题</h1>')
    expect(doc).toContain('<style>')
    expect(doc).toContain('monospace')
  })

  it('深浅色切换影响背景与文字颜色', () => {
    const light = buildPreviewDocument('', { dark: false })
    const dark = buildPreviewDocument('', { dark: true })
    expect(light).toContain('background: #ffffff')
    expect(dark).toContain('background: #232326')
    expect(light).not.toBe(dark)
  })

  it('forPrint 时附带 A4 页边距与打印规则', () => {
    const doc = buildPreviewDocument('<h1>x</h1>', { forPrint: true })
    expect(doc).toContain('@page')
    expect(doc).toContain('size: A4')
    expect(doc).toContain('@media print')
    expect(doc).toContain('break-inside: avoid')
    // 非打印文档不应带页边距规则
    expect(buildPreviewDocument('')).not.toContain('@page')
  })

  it('打印版强制浅色（避免把深色背景打进 PDF）', () => {
    const doc = buildPreviewDocument('x', { forPrint: true, dark: true })
    expect(doc).toContain('@media print')
  })
})
