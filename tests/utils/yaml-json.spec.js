import { describe, it, expect } from 'vitest'
import { yamlToJson, jsonToYaml } from '@/common/utils/yaml-json'

describe('yamlToJson', () => {
  it('基础映射 / 列表 / 嵌套', () => {
    const yaml = ['name: pocketbox', 'tags:', '  - dev', '  - tools', 'meta:', '  ok: true'].join(
      '\n'
    )
    const result = yamlToJson(yaml)
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({
      name: 'pocketbox',
      tags: ['dev', 'tools'],
      meta: { ok: true },
    })
  })

  it('数字、布尔、null、引号字符串类型正确', () => {
    const result = yamlToJson('a: 1\nb: 1.5\nc: false\nd: null\ne: "123"')
    expect(result.value).toEqual({ a: 1, b: 1.5, c: false, d: null, e: '123' })
  })

  it('块标量保留换行', () => {
    const result = yamlToJson('text: |\n  第一行\n  第二行')
    expect(result.value.text).toBe('第一行\n第二行\n')
  })

  it('空输入与语法错误给出中文提示', () => {
    expect(yamlToJson('').error).toContain('为空')
    expect(yamlToJson('   ').error).toContain('为空')
    const broken = yamlToJson('a: [1, 2\nb: 3')
    expect(broken.ok).toBe(false)
    expect(broken.error).toContain('YAML 解析失败')
  })
})

describe('jsonToYaml', () => {
  it('对象 → YAML，键顺序保持不变', () => {
    const result = jsonToYaml({ b: 1, a: 2 })
    expect(result.ok).toBe(true)
    expect(result.text).toBe('b: 1\na: 2')
  })

  it('接受 JSON 字符串输入，长字符串不折行', () => {
    const long = 'x'.repeat(120)
    const result = jsonToYaml(JSON.stringify({ url: long }))
    expect(result.text).toBe(`url: ${long}`)
  })

  it('嵌套与数组的缩进为 2 空格', () => {
    const result = jsonToYaml({ list: [{ a: 1 }], nested: { b: { c: 2 } } })
    expect(result.text).toBe(['list:', '  - a: 1', 'nested:', '  b:', '    c: 2'].join('\n'))
  })

  it('JSON 解析失败 / 空输入给出中文提示', () => {
    expect(jsonToYaml('{oops}').error).toContain('JSON 解析失败')
    expect(jsonToYaml('').error).toContain('为空')
  })

  it('往返一致：JSON → YAML → JSON', () => {
    const source = { name: '中文', list: [1, 2, 3], nested: { ok: true, nil: null } }
    const yaml = jsonToYaml(source)
    const back = yamlToJson(yaml.text)
    expect(back.ok).toBe(true)
    expect(back.value).toEqual(source)
  })
})
