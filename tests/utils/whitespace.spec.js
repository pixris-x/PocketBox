import { describe, expect, it } from 'vitest'
import { WS_DEFAULTS, countWhitespace, normalizeWhitespace } from '@/common/utils/whitespace'

// 全角空格（IDEOGRAPHIC SPACE）与不间断空格（NO-BREAK SPACE）
const FULL = '　'
const NBSP = ' '

describe('normalizeWhitespace 推荐方案（定向两阶段正则）', () => {
  it('压缩行内连续空格为单个空格', () => {
    expect(normalizeWhitespace('a    b')).toBe('a b')
  })

  it('压缩连续制表符为单个空格', () => {
    expect(normalizeWhitespace('a\t\tb')).toBe('a b')
  })

  it('混合空格与制表符压成单个空格', () => {
    expect(normalizeWhitespace('a \t b')).toBe('a b')
  })

  it('CRLF 归一为 \\n（与项目现有约定一致，无条件执行）', () => {
    expect(normalizeWhitespace('a\r\nb')).toBe('a\nb')
  })

  it('旧 Mac 单独 \\r 也归一为 \\n', () => {
    expect(normalizeWhitespace('a\rb')).toBe('a\nb')
  })

  it('全角空格当作空白压缩（CJK 友好）', () => {
    expect(normalizeWhitespace(`中文${FULL}${FULL}文本`)).toBe('中文 文本')
  })

  it('不间断空格(NBSP)当作空白压缩', () => {
    expect(normalizeWhitespace(`a${NBSP}${NBSP}b`)).toBe('a b')
  })

  it('trimLines 默认裁掉整段首尾空行，保留内部空行', () => {
    expect(normalizeWhitespace('  \n a \n  ')).toBe('a')
    expect(normalizeWhitespace('a\n\nb')).toBe('a\n\nb')
  })

  it('removeEmptyLines 删除所有纯空白行', () => {
    expect(normalizeWhitespace('a\n\nb', { removeEmptyLines: true })).toBe('a\nb')
  })

  it('collapseNewlines 把换行也当空白压缩成单行（等价于方案 A）', () => {
    expect(normalizeWhitespace('a\n b \n c', { collapseNewlines: true })).toBe('a b c')
  })
})

describe('normalizeWhitespace 边界与回归哨兵', () => {
  it('空串返回空串', () => {
    expect(normalizeWhitespace('')).toBe('')
  })

  it('非字符串入参返回空串（防御）', () => {
    expect(normalizeWhitespace(null)).toBe('')
    expect(normalizeWhitespace(undefined)).toBe('')
    expect(normalizeWhitespace(123)).toBe('')
  })

  it('纯空白输入返回空串', () => {
    expect(normalizeWhitespace('   \t  ')).toBe('')
    expect(normalizeWhitespace(` ${FULL}${NBSP} `)).toBe('')
  })

  it('合并单行模式下纯空白输入也返回空串', () => {
    expect(normalizeWhitespace('  \n  ', { collapseNewlines: true })).toBe('')
  })

  it('所有开关关闭时仍做 CRLF→LF 归一（与文本批处理一致）', () => {
    const opts = {
      collapseSpaces: false,
      trimLines: false,
      removeEmptyLines: false,
      collapseNewlines: false,
    }
    expect(normalizeWhitespace('a\r\nb', opts)).toBe('a\nb')
  })

  it('行内空格在 collapseNewlines 关闭时得到压缩与逐行 trim', () => {
    expect(normalizeWhitespace('a \n b  c')).toBe('a\nb c')
  })

  it('与文本批处理的区别：本工具压缩行内连续空格，文本批处理只 trim 行首尾', () => {
    const input = 'a    b'
    expect(normalizeWhitespace(input)).toBe('a b')
    // 文本批处理（processText 仅 trimLines）不压缩行内空格
    expect(normalizeWhitespace(input, { collapseSpaces: false })).toBe('a    b')
  })

  it('是纯函数，不修改入参', () => {
    const input = '  a   b  \n'
    normalizeWhitespace(input)
    expect(input).toBe('  a   b  \n')
  })

  it('WS_DEFAULTS 四项默认开启/关闭符合预期', () => {
    expect(WS_DEFAULTS).toEqual({
      collapseSpaces: true,
      trimLines: true,
      removeEmptyLines: false,
      collapseNewlines: false,
    })
  })
})

describe('countWhitespace 统计', () => {
  it('统计全部空白字符数（含换行）', () => {
    // 'a \t b\n' 的空白：空格、制表符、空格、换行 = 4
    expect(countWhitespace('a \t b\n')).toBe(4)
  })

  it('空文本为 0', () => {
    expect(countWhitespace('')).toBe(0)
    expect(countWhitespace(null)).toBe(0)
  })

  it('无空白文本为 0', () => {
    expect(countWhitespace('abc中文')).toBe(0)
  })
})
