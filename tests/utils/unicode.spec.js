import { describe, it, expect } from 'vitest'
import {
  inspectText,
  decodeRefs,
  encodeHtmlEntities,
  toHexCodePoint,
  toJsEscape,
} from '@/common/utils/unicode'

describe('inspectText', () => {
  it('逐码点拆分，emoji 代理对算一个字符', () => {
    const chars = inspectText('A中😀')
    expect(chars).toHaveLength(3)
    expect(chars[0]).toMatchObject({ char: 'A', codePoint: 65, hex: 'U+0041', utf8: [65] })
    expect(chars[1]).toMatchObject({
      char: '中',
      codePoint: 0x4e2d,
      hex: 'U+4E2D',
      utf8: [0xe4, 0xb8, 0xad],
    })
    expect(chars[2]).toMatchObject({
      char: '😀',
      codePoint: 0x1f600,
      hex: 'U+1F600',
      utf8: [0xf0, 0x9f, 0x98, 0x80],
    })
  })

  it('JS 转义：BMP 用 \\uXXXX，增补平面用 \\u{...}', () => {
    expect(toJsEscape(0x4e2d)).toBe('\\u4E2D')
    expect(toJsEscape(0x1f600)).toBe('\\u{1F600}')
    expect(inspectText('😀')[0].jsEscape).toBe('\\u{1F600}')
  })

  it('空串与非字符串返回空数组', () => {
    expect(inspectText('')).toEqual([])
    expect(inspectText(undefined)).toEqual([])
  })
})

describe('decodeRefs', () => {
  it('识别 U+ / \\u / \\u{} / &#x; / &#十进制; 五种写法且可混排', () => {
    expect(decodeRefs('U+4E2D')).toBe('中')
    expect(decodeRefs('\\u4E2D')).toBe('中')
    expect(decodeRefs('\\u{4E2D}')).toBe('中')
    expect(decodeRefs('&#x4E2D;')).toBe('中')
    expect(decodeRefs('&#20013;')).toBe('中')
    expect(decodeRefs('U+4E2D is \\u4E2D')).toBe('中 is 中')
  })

  it('增补平面 emoji 与无分号数字实体', () => {
    expect(decodeRefs('\\u{1F600}')).toBe('😀')
    expect(decodeRefs('&#x1F600;')).toBe('😀')
    expect(decodeRefs('&#128512;')).toBe('😀')
    expect(decodeRefs('&#x1F600')).toBe('😀')
  })

  it('非法与无法识别的内容原样保留', () => {
    expect(decodeRefs('U+D800')).toBe('U+D800') // 孤立代理区
    expect(decodeRefs('U+110000')).toBe('U+110000') // 超出 Unicode 上限
    expect(decodeRefs('&#xGG;')).toBe('&#xGG;')
    expect(decodeRefs('plain text')).toBe('plain text')
    expect(decodeRefs('')).toBe('')
  })
})

describe('encodeHtmlEntities', () => {
  it('五个保留字符转命名实体，其余不动', () => {
    expect(encodeHtmlEntities(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;')
    expect(encodeHtmlEntities('中文')).toBe('中文')
  })

  it('escapeNonAscii 时非 ASCII 转数字实体', () => {
    expect(encodeHtmlEntities('中<a', { escapeNonAscii: true })).toBe('&#x4E2D;&lt;a')
  })

  it('toHexCodePoint 补齐 4 位', () => {
    expect(toHexCodePoint(65)).toBe('U+0041')
    expect(toHexCodePoint(0x4e2d)).toBe('U+4E2D')
  })
})
