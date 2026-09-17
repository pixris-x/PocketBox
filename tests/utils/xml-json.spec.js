import { describe, it, expect } from 'vitest'
import { xmlToJson, jsonToXml } from '@/common/utils/xml-json'

describe('xmlToJson', () => {
  it('基础嵌套：文本元素直接作为值', () => {
    const result = xmlToJson('<root><name>张三</name><age>20</age></root>')
    expect(result).toEqual({ ok: true, data: { name: '张三', age: '20' } })
  })

  it('属性转 @ 键，自闭合与空元素', () => {
    const result = xmlToJson('<root id="1"><item flag="a"/><item flag="b"></item></root>')
    expect(result.ok).toBe(true)
    expect(result.data).toEqual({
      '@id': '1',
      item: [{ '@flag': 'a' }, { '@flag': 'b' }],
    })
  })

  it('重复兄弟元素 → 数组，单个保持对象', () => {
    expect(xmlToJson('<r><i>1</i><i>2</i></r>').data).toEqual({ i: ['1', '2'] })
    expect(xmlToJson('<r><i>1</i></r>').data).toEqual({ i: '1' })
  })

  it('混合内容：多段文本合并进 #text', () => {
    const result = xmlToJson('<r>前<a>x</a>后</r>')
    expect(result.data).toEqual({ '#text': '前后', a: 'x' })
  })

  it('声明、注释、DOCTYPE 跳过；CDATA 原样保留', () => {
    const xml = [
      '<?xml version="1.0"?>',
      '<!-- 注释 -->',
      '<!DOCTYPE note>',
      '<root><code><![CDATA[if (a < b && c > d)]]></code></root>',
    ].join('')
    const result = xmlToJson(xml)
    expect(result.data.code).toBe('if (a < b && c > d)')
  })

  it('基本实体解码（命名 + 数字 + 十六进制）', () => {
    const result = xmlToJson('<r><a>&lt;&amp;&gt;</a><b>&#20013;</b><c>&#x4E2D;</c></r>')
    expect(result.data).toEqual({ a: '<&>', b: '中', c: '中' })
  })

  it('标签未闭合 / 根缺失报中文错误', () => {
    expect(xmlToJson('<root><a></root>').ok).toBe(false)
    expect(xmlToJson('<root><a>').error).toContain('闭合')
    expect(xmlToJson('plain text').ok).toBe(false)
    expect(xmlToJson('').ok).toBe(false)
  })
})

describe('jsonToXml', () => {
  it('对象 → 元素，@键 → 属性，null → 空元素文本', () => {
    const xml = jsonToXml(
      { '@id': '1', name: '张三', note: null },
      { rootName: 'user', indent: 0, declaration: false }
    )
    expect(xml).toBe('<user id="1"><name>张三</name><note></note></user>')
  })

  it('数组生成重复元素，#text 生成文本内容', () => {
    const xml = jsonToXml(
      { item: ['a', 'b'], '#text': 'hello' },
      { rootName: 'r', indent: 0, declaration: false }
    )
    expect(xml).toBe('<r>hello<item>a</item><item>b</item></r>')
  })

  it('文本中的保留字符转义', () => {
    const xml = jsonToXml({ a: '<b>&"c"' }, { rootName: 'r', indent: 0, declaration: false })
    expect(xml).toBe('<r><a>&lt;b&gt;&amp;&quot;c&quot;</a></r>')
  })

  it('indent > 0 时带声明并缩进换行', () => {
    const xml = jsonToXml({ a: '1' }, { rootName: 'root', indent: 2, declaration: true })
    expect(xml).toBe(
      ['<?xml version="1.0" encoding="UTF-8"?>', '<root>', '  <a>1</a>', '</root>'].join('\n')
    )
  })

  it('json → xml → json 往返一致（属性与数组）', () => {
    const source = { '@v': '2', list: [{ n: 'a' }, { n: 'b' }] }
    const xml = jsonToXml(source, { rootName: 'root', indent: 0, declaration: false })
    const back = xmlToJson(xml)
    expect(back.ok).toBe(true)
    expect(back.data).toEqual(source)
  })
})
