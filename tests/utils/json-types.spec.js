import { describe, expect, it } from 'vitest'
import {
  JSON_TYPE_INDENTS,
  JSON_TYPE_LANGUAGES,
  JSON_TYPE_NAMINGS,
  fieldName,
  inferJsonType,
  jsonToAllTypes,
  jsonToType,
  mergeNodes,
  rootTypeName,
  summarizeTypeStats,
} from '@/common/utils/json-types'

describe('页面下拉选项契约', () => {
  it('UiSelect 直传的选项必须用 value 作 key', () => {
    // UiSelect 内部只读 option.value；曾把 JSON_TYPE_NAMINGS 写成 id，
    // 导致选中后 naming 被赋成 undefined，表现为「字段命名下拉选了没反应」
    expect(JSON_TYPE_NAMINGS.every((item) => item.value !== undefined)).toBe(true)
    expect(JSON_TYPE_INDENTS.every((item) => item.value !== undefined)).toBe(true)
    expect(JSON_TYPE_NAMINGS.map((item) => item.value)).toEqual([
      'keep',
      'camel',
      'snake',
      'pascal',
    ])
  })

  it('命名选项的 value 都能被 jsonToType 接受', () => {
    // 期望值按 naming 逐项写死：若某个 value 取不到，naming 会退化成 undefined 而不报错
    const expected = {
      keep: 'user_name',
      camel: 'userName',
      snake: 'user_name',
      pascal: 'UserName',
    }
    for (const item of JSON_TYPE_NAMINGS) {
      const code = jsonToType('{"user_name":"a"}', { lang: 'typescript', naming: item.value })
      expect(code).toContain(`${expected[item.value]}: string`)
      expect(code).not.toContain('undefined')
    }
  })

  it('语言列表的 id 覆盖默认命名表', () => {
    for (const lang of JSON_TYPE_LANGUAGES) {
      expect(typeof lang.id).toBe('string')
      expect(typeof lang.label).toBe('string')
    }
  })
})

describe('inferJsonType 类型推断', () => {
  it('识别标量并区分整数与浮点', () => {
    expect(inferJsonType('a')).toEqual({ kind: 'string' })
    expect(inferJsonType(true)).toEqual({ kind: 'boolean' })
    expect(inferJsonType(null)).toEqual({ kind: 'null' })
  })

  it('数字节点带值域，供 C# 区分 int 与 long', () => {
    expect(inferJsonType(3)).toEqual({ kind: 'number', integer: true, min: 3, max: 3 })
    expect(inferJsonType(3.5)).toEqual({ kind: 'number', integer: false, min: 3.5, max: 3.5 })
  })

  it('空数组的元素类型为未知', () => {
    expect(inferJsonType([])).toEqual({ kind: 'array', element: null })
  })

  it('嵌套层级正常下钻', () => {
    const node = inferJsonType({ a: { b: 1 } })
    expect(node.kind).toBe('object')
    expect(node.fields[0].key).toBe('a')
    expect(node.fields[0].node.kind).toBe('object')
    expect(node.fields[0].node.fields[0].node.kind).toBe('number')
  })
})

describe('mergeNodes 归并', () => {
  it('整数与浮点归并后按浮点处理，值域取并集', () => {
    expect(
      mergeNodes(
        { kind: 'number', integer: true, min: 1, max: 1 },
        { kind: 'number', integer: false, min: 2, max: 2 }
      )
    ).toEqual({ kind: 'number', integer: false, min: 1, max: 2 })
  })

  it('不同标量并成联合类型且去重', () => {
    const merged = mergeNodes({ kind: 'string' }, { kind: 'number', integer: true, min: 1, max: 1 })
    expect(merged.kind).toBe('union')
    expect(merged.members).toEqual([
      { kind: 'string' },
      { kind: 'number', integer: true, min: 1, max: 1 },
    ])
  })

  it('对象字段取并集，缺失方标记为可选', () => {
    const a = { kind: 'object', fields: [{ key: 'x', node: { kind: 'string' }, optional: false }] }
    const b = {
      kind: 'object',
      fields: [{ key: 'y', node: { kind: 'number', integer: true }, optional: false }],
    }
    const merged = mergeNodes(a, b)
    expect(merged.fields.map((f) => [f.key, f.optional])).toEqual([
      ['x', true],
      ['y', true],
    ])
  })

  it('空数组不覆盖另一侧的元素类型', () => {
    const empty = { kind: 'array', element: null }
    const filled = { kind: 'array', element: { kind: 'string' } }
    expect(mergeNodes(empty, filled).element).toEqual({ kind: 'string' })
    expect(mergeNodes(filled, empty).element).toEqual({ kind: 'string' })
  })
})

describe('fieldName 字段命名', () => {
  it('keep 风格保留合法原名', () => {
    expect(fieldName('userName', 'keep', 'typescript')).toBe('userName')
    expect(fieldName('user_name', 'keep', 'go')).toBe('user_name')
  })

  it('显式选风格时必须生效，即便原名已合法', () => {
    expect(fieldName('user_name', 'camel', 'typescript')).toBe('userName')
    expect(fieldName('userName', 'snake', 'python')).toBe('user_name')
  })

  it('Python 保留字追加下划线', () => {
    expect(fieldName('class', 'keep', 'python')).toBe('class_')
    expect(fieldName('def', 'keep', 'python')).toBe('def_')
  })

  it('非标识符键名按语言回退风格转换', () => {
    expect(fieldName('user-name', 'keep', 'go')).toBe('UserName')
    expect(fieldName('user-name', 'keep', 'java')).toBe('userName')
    expect(fieldName('user-name', 'keep', 'python')).toBe('user_name')
  })

  it('数字开头的键名补下划线前缀', () => {
    expect(fieldName('1num', 'keep', 'go')).toBe('_1num')
    expect(fieldName('2x', 'keep', 'python')).toBe('_2x')
  })

  it('纯符号键用哈希兜底且不撞名', () => {
    const a = fieldName('!!!', 'keep', 'python')
    const b = fieldName('???', 'keep', 'python')
    expect(a).not.toBe(b)
    expect(a).toMatch(/^field[0-9a-z]+$/)
  })

  it('四种命名风格在完整输出里各自生效', () => {
    // 页面上的「字段命名」下拉直接对应这四种，必须全部可用（曾因下拉被 label 吞掉点击而整体失效）
    const src = '{"user_name":"a","ID":1,"my-key":"c"}'
    const names = (naming) =>
      jsonToType(src, { lang: 'typescript', naming })
        .split('\n')
        .filter((line) => /^\s+\S+:/.test(line))
        .map((line) => line.trim().split(':')[0])
        .join(',')

    expect(names('keep')).toBe('user_name,ID,"my-key"')
    expect(names('camel')).toBe('userName,id,myKey')
    expect(names('snake')).toBe('user_name,id,my_key')
    expect(names('pascal')).toBe('UserName,Id,MyKey')
  })

  it('嵌套对象的字段名同样走命名风格', () => {
    const code = jsonToType('{"author_info":{"user_name":"a"}}', {
      lang: 'typescript',
      naming: 'camel',
    })
    expect(code).toContain('authorInfo: RootAuthorInfo')
    expect(code).toContain('userName: string')
  })

  it('Python 3 接受中文标识符', () => {
    expect(fieldName('中文键', 'keep', 'python')).toBe('中文键')
  })

  it('C# 关键字用 @ 前缀转义而非改名', () => {
    expect(fieldName('class', 'keep', 'csharp')).toBe('@class')
    expect(fieldName('string', 'keep', 'csharp')).toBe('@string')
    // 普通标识符不加前缀
    expect(fieldName('name', 'keep', 'csharp')).toBe('name')
  })
})

describe('rootTypeName 顶层类型名', () => {
  it('转 PascalCase', () => {
    expect(rootTypeName('api data')).toBe('ApiData')
    expect(rootTypeName('user-profile')).toBe('UserProfile')
  })

  it('空值与纯符号回退到默认名', () => {
    expect(rootTypeName('')).toBe('Root')
    expect(rootTypeName('   ')).toBe('Root')
    expect(rootTypeName('!!!', 'Fallback')).toBe('Fallback')
  })
})

describe('jsonToType 各语言输出', () => {
  it('TypeScript：嵌套结构生成独立 interface，可选字段加 ?', () => {
    const code = jsonToType('{"a":{"b":1},"list":[{"c":"x"},{"c":"y","d":true}]}', {
      lang: 'typescript',
    })
    expect(code).toContain('export interface RootListItem {')
    expect(code).toContain('c: string')
    expect(code).toContain('d?: boolean')
    expect(code).toContain('a: RootA')
    expect(code).toContain('list: RootListItem[]')
  })

  it('Go：字段带 json tag，可选字段带 omitempty', () => {
    const code = jsonToType('{"a":{"b":1},"list":[{"c":"x"},{"c":"y","d":true}]}', { lang: 'go' })
    expect(code).toContain('type RootListItem struct {')
    // Go 字段名按 PascalCase，json tag 保留原始键名
    expect(code).toContain('B int `json:"b"`')
    expect(code).toContain('C string `json:"c"`')
    expect(code).toContain('D boolean `json:"d,omitempty"`')
    expect(code).toContain('A RootA `json:"a"`')
  })

  it('Python：dataclass 必填字段排在可选字段之前', () => {
    // 数组内 a 每次都出现（必填），b / c 只出现一次（可选）
    const code = jsonToType('[{"a":1,"b":1},{"a":2,"c":3}]', { lang: 'python' })
    const body = code.slice(code.indexOf('class RootItem:'))
    // 只取缩进的字段行，class 声明行本身不带缩进
    const lines = body.split('\n').filter((line) => line.startsWith('  '))
    expect(lines).toEqual(['  a: int', '  b: Optional[int] = None', '  c: Optional[int] = None'])
  })

  it('Python：可选字段带 = None 默认值，嵌套注解用字符串', () => {
    const code = jsonToType('{"author":{"name":"a"},"tag":[{"k":1},{"v":2}]}', { lang: 'python' })
    expect(code).toContain('from dataclasses import dataclass')
    expect(code).toContain('author: "RootAuthor"')
    expect(code).toContain('v: Optional[int] = None')
  })

  it('Python：保留字与数字开头的键名都合法', () => {
    const code = jsonToType('{"class":"a","1num":"b","user-name":"c"}', { lang: 'python' })
    expect(code).toContain('class_: str')
    expect(code).toContain('_1num: str')
    expect(code).toContain('user_name: str')
    expect(code).not.toContain('user-name')
  })

  it('Java：数值用包装类型，浮点为 Double', () => {
    const code = jsonToType('{"i":1,"f":9.5,"b":true,"s":"x","list":[1,2]}', { lang: 'java' })
    expect(code).toContain('private Integer i;')
    expect(code).toContain('private Double f;')
    expect(code).toContain('private Boolean b;')
    expect(code).toContain('private String s;')
    expect(code).toContain('private List<Integer> list;')
    expect(code).toContain('import java.util.List;')
  })

  it('Go 与 Java 无联合类型时退化为宽类型', () => {
    expect(jsonToType('[1,"a"]', { lang: 'go' })).toContain('[]interface{}')
    // Java 没有类型别名，根节点退化为只含一个 value 字段的类
    expect(jsonToType('[1,"a"]', { lang: 'java' })).toContain('private List<Object> value;')
    // C# 同样没有联合类型，也没有类型别名
    expect(jsonToType('[1,"a"]', { lang: 'csharp' })).toContain('List<object> Value { get; set; }')
  })

  it('C#：使用属性语法并开启可空引用类型', () => {
    const code = jsonToType('{"name":"a","list":[1,2]}', { lang: 'csharp' })
    expect(code.startsWith('#nullable enable')).toBe(true)
    expect(code).toContain('public string Name { get; set; }')
    expect(code).toContain('public List<int> List { get; set; }')
    expect(code).toContain('using System.Collections.Generic;')
  })

  it('C#：值类型不可空，可选字段包一层 Nullable', () => {
    // 数组内 x 每次都在（必填 int），y 只出现一次（可选 int?）
    const code = jsonToType('[{"x":1},{"x":1,"y":2}]', { lang: 'csharp' })
    expect(code).toContain('public int X { get; set; }')
    expect(code).toContain('public int? Y { get; set; }')
  })

  it('C#：引用类型的可选字段不加问号', () => {
    const code = jsonToType('[{"s":"x"},{"s":"y","o":{"k":1}}]', { lang: 'csharp' })
    expect(code).toContain('public string S { get; set; }')
    // o 只在部分样本出现 → 嵌套类属引用类型，默认可空，不加 ?
    expect(code).toContain('public RootItemO O { get; set; }')
  })

  it('C#：JSON null 无类型线索，落到 object', () => {
    // null 值本身不带类型信息，与「字段可选」是两回事：这里按 object 处理
    const code = jsonToType('{"site":null,"o":{}}', { lang: 'csharp' })
    expect(code).toContain('public object Site { get; set; }')
  })

  it('C#：整数按值域区分 int 与 long', () => {
    const code = jsonToType('{"a":1,"b":3000000000,"c":2147483647,"d":9.5}', { lang: 'csharp' })
    expect(code).toContain('public int A { get; set; }')
    // 超出 int32 上界 → long
    expect(code).toContain('public long B { get; set; }')
    expect(code).toContain('public int C { get; set; }')
    expect(code).toContain('public double D { get; set; }')
  })

  it('C#：属性名与键名不一致时加 [JsonPropertyName]', () => {
    const code = jsonToType('{"user_name":"a","class":"b"}', { lang: 'csharp' })
    expect(code).toContain('public string UserName { get; set; } [JsonPropertyName("user_name")]')
    // class 转成 PascalCase 的 Class 已是合法标识符，无需 @ 转义
    expect(code).toContain('public string Class { get; set; } [JsonPropertyName("class")]')
    expect(code).toContain('using System.Text.Json.Serialization;')
  })

  it('C#：保留原名时属性名与键名一致，不加特性', () => {
    const code = jsonToType('{"user_name":"a"}', { lang: 'csharp', naming: 'keep' })
    expect(code).toContain('public string user_name { get; set; }')
    expect(code).not.toContain('JsonPropertyName')
  })

  it('C#：空容器用 Dictionary 与 List<object>', () => {
    const code = jsonToType('{"o":{},"l":[]}', { lang: 'csharp' })
    expect(code).toContain('Dictionary<string, object>')
    expect(code).toContain('List<object>')
  })

  it('C#：类型名按父名加字段名派生', () => {
    const code = jsonToType('{"author":{"name":"a"}}', { lang: 'csharp', typeName: 'api data' })
    expect(code).toContain('public class ApiDataAuthor {')
    expect(code).toContain('public ApiDataAuthor Author { get; set; }')
  })

  it('空容器不产生悬空引用', () => {
    expect(jsonToType('{"list":[],"obj":{}}', { lang: 'typescript' })).toContain('list: unknown[]')
    expect(jsonToType('{"list":[],"obj":{}}', { lang: 'typescript' })).toContain(
      'obj: Record<string, unknown>'
    )
    expect(jsonToType('{"obj":{}}', { lang: 'go' })).toContain('Obj map[string]interface{}')
  })

  it('根为数组或标量时生成类型别名', () => {
    expect(jsonToType('[{"a":1}]', { lang: 'typescript' })).toContain(
      'export type Root = RootItem[]'
    )
    expect(jsonToType('"hi"', { lang: 'typescript' })).toBe('export type Root = string')
  })

  it('数组元素是联合类型时加括号', () => {
    // 不加括号会生成 number | string | boolean[] 这种错误写法
    expect(jsonToType('[1,"a",true]', { lang: 'typescript' })).toBe(
      'export type Root = (number | string | boolean)[]'
    )
  })

  it('同名字段生成唯一类型名', () => {
    const code = jsonToType('{"x":{"v":1},"x2":{"v":1}}', { lang: 'typescript' })
    const names = code.match(/export interface (\w+)/g)
    expect(new Set(names).size).toBe(names.length)
  })

  it('类型名按父名加字段名派生', () => {
    // 嵌套名走 naming.js 的拆词再 PascalCase，故 a→b→c 得到 RootAB
    const code = jsonToType('{"a":{"b":{"c":1}}}', { lang: 'typescript' })
    expect(code).toContain('export interface RootAB {')
    expect(code).toContain('a: RootA')
  })

  it('Go 的 json tag 始终保留原始键名', () => {
    const code = jsonToType('{"user-name":"b"}', { lang: 'go', naming: 'camel' })
    expect(code).toContain('userName string `json:"user-name"`')
  })

  it('缩进可切换为 Tab', () => {
    const code = jsonToType('{"a":{"b":1}}', { lang: 'go', indent: 'tab' })
    expect(code).toContain('\tB int `json:"b"`')
  })

  it('各语言默认命名风格不同', () => {
    expect(jsonToType('{"user_name":"a"}', { lang: 'go' })).toContain('UserName')
    expect(jsonToType('{"user_name":"a"}', { lang: 'python' })).toContain('user_name')
    expect(jsonToType('{"user_name":"a"}', { lang: 'typescript' })).toContain('user_name')
  })

  it('TypeScript 允许非标识符键名（引号包裹）', () => {
    const code = jsonToType('{"user-name":"b","1num":"d"}', { lang: 'typescript' })
    expect(code).toContain('"user-name": string')
    expect(code).toContain('"1num": string')
  })

  it('JSON 非法时抛错', () => {
    expect(() => jsonToType('{bad}')).toThrow()
  })
})

describe('jsonToAllTypes 批量转换', () => {
  it('一次产出全部语言', () => {
    const results = jsonToAllTypes('{"a":1}')
    expect(results.map((item) => item.id)).toEqual(JSON_TYPE_LANGUAGES.map((item) => item.id))
    expect(results.every((item) => item.code.length > 0)).toBe(true)
  })
})

describe('summarizeTypeStats 概览统计', () => {
  it('统计类型数、字段数与最大层级', () => {
    // 4 个节点：根对象、a 的 number、b 的对象、c 的 number
    expect(summarizeTypeStats('{"a":1,"b":{"c":2}}')).toEqual({ types: 4, fields: 3, maxDepth: 2 })
  })

  it('解析失败返回全 0', () => {
    expect(summarizeTypeStats('{bad}')).toEqual({ types: 0, fields: 0, maxDepth: 0 })
  })
})
