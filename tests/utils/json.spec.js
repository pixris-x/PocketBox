import { describe, expect, it } from 'vitest'
import { formatJson, minifyJson, parseJson } from '@/common/utils/json'

describe('parseJson', () => {
  it('解析合法 JSON', () => {
    expect(parseJson('{"a":1}')).toEqual({ a: 1 })
    expect(parseJson('[1,2,3]')).toEqual([1, 2, 3])
    expect(parseJson('"str"')).toBe('str')
    expect(parseJson('null')).toBe(null)
  })

  it('保留键的原始顺序', () => {
    expect(Object.keys(parseJson('{"b":1,"a":2}'))).toEqual(['b', 'a'])
  })

  // V8 的错误消息自带 (line x column y)，下面的行列值即由此提取而来
  it('报错时转成中文并列出行列位置', () => {
    expect(() => parseJson('{bad}')).toThrow('JSON 解析失败：第 1 行，第 2 列')
    expect(() => parseJson('{"a":1,}')).toThrow('JSON 解析失败：第 1 行，第 8 列')
    expect(() => parseJson('[1,2')).toThrow('JSON 解析失败：第 1 行，第 5 列')
  })

  it('多行输入的行号正确', () => {
    expect(() => parseJson('{\n  "a": 1,\n  bad\n}')).toThrow(/第 3 行/)
  })

  it('拿不到位置信息时退化为原始消息', () => {
    expect(() => parseJson('')).toThrow('JSON 解析失败')
    expect(() => parseJson('{"a":}')).toThrow('JSON 解析失败')
  })
})

describe('formatJson', () => {
  it('默认按 2 空格缩进', () => {
    expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}')
  })

  it('可自定义缩进宽度', () => {
    expect(formatJson('{"a":1}', { indent: 4 })).toBe('{\n    "a": 1\n}')
    expect(formatJson('{"a":1}', { indent: 0 })).toBe('{"a":1}')
  })

  it('sortKeys 按字典序排列对象键', () => {
    expect(formatJson('{"b":1,"a":2}', { sortKeys: true })).toBe('{\n  "a": 2,\n  "b": 1\n}')
  })

  it('sortKeys 递归作用于嵌套对象', () => {
    expect(formatJson('{"b":{"d":1,"c":2},"a":3}', { sortKeys: true })).toBe(
      '{\n  "a": 3,\n  "b": {\n    "c": 2,\n    "d": 1\n  }\n}'
    )
  })

  it('sortKeys 不改变数组元素顺序', () => {
    expect(formatJson('[3,1,2]', { sortKeys: true })).toBe('[\n  3,\n  1,\n  2\n]')
    expect(formatJson('[{"b":1,"a":2}]', { sortKeys: true })).toBe(
      '[\n  {\n    "a": 2,\n    "b": 1\n  }\n]'
    )
  })

  it('非法输入照常抛错', () => {
    expect(() => formatJson('nope')).toThrow('JSON 解析失败')
  })
})

describe('minifyJson', () => {
  it('压缩为单行', () => {
    expect(minifyJson('{\n  "a": 1\n}')).toBe('{"a":1}')
    expect(minifyJson('[1, 2, 3]')).toBe('[1,2,3]')
  })

  it('不改变数据本身', () => {
    expect(parseJson(minifyJson('{ "a": [1, 2], "b": null }'))).toEqual({ a: [1, 2], b: null })
  })

  it('非法输入抛错', () => {
    expect(() => minifyJson('')).toThrow('JSON 解析失败')
  })
})
