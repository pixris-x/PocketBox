// ============================================================
// CSV → Markdown 表格纯函数（复用 csv.js 的 RFC 4180 解析）
// ============================================================
import { parseCsvRows } from './csv'

const ALIGN_RULES = {
  left: ':---',
  center: ':---:',
  right: '---:',
}

/**
 * @param {string} text CSV 文本
 * @param {{delimiter?: string, align?: 'left'|'center'|'right', header?: boolean}} [options]
 *   header=false 时自动生成「列1、列2…」表头
 * @returns {string} Markdown 表格文本
 */
export function csvToMarkdown(text, { delimiter = ',', align = 'left', header = true } = {}) {
  const rows = parseCsvRows(String(text ?? ''), delimiter)
  if (rows.length === 0) return ''

  const rule = ALIGN_RULES[align] || ALIGN_RULES.left
  const columns = Math.max(...rows.map((row) => row.length))

  const head = header ? rows[0] : Array.from({ length: columns }, (_, i) => `列${i + 1}`)
  const body = header ? rows.slice(1) : rows

  const render = (cells) =>
    `| ${Array.from({ length: columns }, (_, i) => escapeCell(cells[i] ?? '')).join(' | ')} |`

  const lines = [render(head), `| ${Array.from({ length: columns }, () => rule).join(' | ')} |`]
  for (const row of body) lines.push(render(row))
  return lines.join('\n')
}

function escapeCell(cell) {
  return String(cell).replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|')
}
