import { describe, it, expect } from 'vitest'
import {
  buildJsonTree,
  collectContainerPaths,
  collectPathsUntilDepth,
  describeSize,
  flattenTree,
  previewValue,
  summarizeTree,
  toPlain,
  typeOfValue,
  valueToText,
} from '@/common/utils/json-tree'

describe('typeOfValue', () => {
  it('区分 null 与 object', () => {
    expect(typeOfValue(null)).toBe('null')
    expect(typeOfValue({})).toBe('object')
  })

  it('区分 array 与 object', () => {
    expect(typeOfValue([])).toBe('array')
    expect(typeOfValue({ a: 1 })).toBe('object')
  })

  it('覆盖基本类型', () => {
    expect(typeOfValue('x')).toBe('string')
    expect(typeOfValue(1)).toBe('number')
    expect(typeOfValue(true)).toBe('boolean')
  })
})

describe('buildJsonTree', () => {
  it('根节点使用 $ 作为路径，depth 为 0', () => {
    const tree = buildJsonTree('{"a":1}')
    expect(tree.path).toBe('$')
    expect(tree.key).toBe(null)
    expect(tree.depth).toBe(0)
    expect(tree.type).toBe('object')
    expect(tree.size).toBe(1)
  })

  it('对象子节点用点号路径', () => {
    const tree = buildJsonTree('{"a":1}')
    const child = tree.children[0]
    expect(child.key).toBe('a')
    expect(child.path).toBe('$.a')
    expect(child.type).toBe('number')
    expect(child.value).toBe(1)
    expect(child.depth).toBe(1)
  })

  it('数组子节点用 [i] 路径且 key 为字符串下标', () => {
    const tree = buildJsonTree('[1,"x"]')
    expect(tree.type).toBe('array')
    expect(tree.size).toBe(2)
    expect(tree.children[0].path).toBe('$[0]')
    expect(tree.children[0].key).toBe('0')
    expect(tree.children[0].value).toBe(1)
    expect(tree.children[1].path).toBe('$[1]')
    expect(tree.children[1].value).toBe('x')
  })

  it('非标识符的键改用方括号加引号', () => {
    const tree = buildJsonTree('{"my key":1,"2n":true,"ok_ok":3}')
    expect(tree.children[0].path).toBe('$["my key"]')
    expect(tree.children[1].path).toBe('$["2n"]')
    expect(tree.children[2].path).toBe('$.ok_ok')
  })

  it('嵌套结构逐层递增 depth', () => {
    const tree = buildJsonTree('{"a":{"b":[1,2]}}')
    const a = tree.children[0]
    const b = a.children[0]
    expect(a.depth).toBe(1)
    expect(b.depth).toBe(2)
    expect(b.type).toBe('array')
    expect(b.children[0].depth).toBe(3)
    expect(b.children[0].path).toBe('$.a.b[0]')
  })

  it('空容器 size 为 0 且无子节点', () => {
    const obj = buildJsonTree('{}')
    expect(obj.size).toBe(0)
    expect(obj.children).toEqual([])

    const arr = buildJsonTree('[]')
    expect(arr.size).toBe(0)
    expect(arr.children).toEqual([])
  })

  it('叶子节点不携带 children 与 value', () => {
    const leaf = buildJsonTree('"hi"')
    expect(leaf.type).toBe('string')
    expect(leaf.value).toBe('hi')
    expect(leaf.children).toEqual([])
    expect(leaf.size).toBe(0)
  })

  it('非法 JSON 沿用带行列的错误提示', () => {
    expect(() => buildJsonTree('{"a":1,}')).toThrow(/JSON 解析失败/)
  })
})

describe('describeSize', () => {
  it('对象按键数描述', () => {
    expect(describeSize(buildJsonTree('{"a":1,"b":2}'))).toBe('2 个键')
  })

  it('数组按项数描述', () => {
    expect(describeSize(buildJsonTree('[1,2,3]'))).toBe('3 项')
  })

  it('叶子节点无描述', () => {
    expect(describeSize(buildJsonTree('42'))).toBe('')
  })
})

describe('previewValue', () => {
  it('字符串不带引号（树视图直接展示值）', () => {
    expect(previewValue(buildJsonTree('"hi"'))).toBe('hi')
  })

  it('数字与布尔直接输出，null 输出 null', () => {
    expect(previewValue(buildJsonTree('42'))).toBe('42')
    expect(previewValue(buildJsonTree('true'))).toBe('true')
    expect(previewValue(buildJsonTree('null'))).toBe('null')
  })

  it('容器不输出值', () => {
    expect(previewValue(buildJsonTree('[1]'))).toBe('')
  })

  it('超长字符串截断并加省略号', () => {
    const long = 'x'.repeat(200)
    expect(previewValue(buildJsonTree(JSON.stringify(long)), 10)).toBe(`${'x'.repeat(10)}…`)
  })

  it('默认上限 120 个字符', () => {
    const atLimit = 'y'.repeat(120)
    const overLimit = 'y'.repeat(121)
    expect(previewValue(buildJsonTree(JSON.stringify(atLimit)))).toBe(atLimit)
    expect(previewValue(buildJsonTree(JSON.stringify(overLimit)))).toBe(`${'y'.repeat(120)}…`)
  })
})

describe('toPlain', () => {
  it('还原嵌套结构为普通值', () => {
    const source = { a: { b: [1, 'x', null] }, c: true }
    expect(toPlain(buildJsonTree(JSON.stringify(source)))).toEqual(source)
  })

  it('还原数组保留顺序', () => {
    expect(toPlain(buildJsonTree('[3,2,1]'))).toEqual([3, 2, 1])
  })

  it('还原叶子', () => {
    expect(toPlain(buildJsonTree('"hi"'))).toBe('hi')
  })
})

describe('valueToText', () => {
  it('字符串不带引号（便于粘贴）', () => {
    expect(valueToText(buildJsonTree('"hi"'))).toBe('hi')
  })

  it('null 与布尔转成字面量文本', () => {
    expect(valueToText(buildJsonTree('null'))).toBe('null')
    expect(valueToText(buildJsonTree('false'))).toBe('false')
  })

  it('容器转成缩进 JSON', () => {
    expect(valueToText(buildJsonTree('{"a":1}'))).toBe('{\n  "a": 1\n}')
  })
})

describe('collectPathsUntilDepth', () => {
  const tree = buildJsonTree('{"a":{"b":{"c":1}},"d":2}')

  it('只收集到指定深度', () => {
    expect(collectPathsUntilDepth(tree, 1)).toEqual(['$', '$.a', '$.d'])
  })

  it('深度 0 只有根节点', () => {
    expect(collectPathsUntilDepth(tree, 0)).toEqual(['$'])
  })
})

describe('collectContainerPaths', () => {
  it('收集全部容器节点路径', () => {
    const tree = buildJsonTree('{"a":{"b":1},"c":2}')
    expect(collectContainerPaths(tree)).toEqual(['$', '$.a'])
  })

  it('叶子结构无容器路径', () => {
    expect(collectContainerPaths(buildJsonTree('42'))).toEqual([])
  })
})

describe('flattenTree', () => {
  const tree = buildJsonTree('{"a":{"b":1},"c":2}')

  it('未展开容器时只显示其直接层级', () => {
    const rows = flattenTree(tree, ['$'])
    expect(rows.map((row) => row.node.path)).toEqual(['$', '$.a', '$.c'])
    expect(rows[1].hasChildren).toBe(true)
    expect(rows[1].expanded).toBe(false)
  })

  it('展开容器后才显示子节点', () => {
    const rows = flattenTree(tree, ['$', '$.a'])
    expect(rows.map((row) => row.node.path)).toEqual(['$', '$.a', '$.a.b', '$.c'])
  })

  it('折叠根节点时只剩一行', () => {
    const rows = flattenTree(tree, [])
    expect(rows).toHaveLength(1)
    expect(rows[0].expanded).toBe(false)
    expect(rows[0].hasChildren).toBe(true)
  })

  it('接受普通数组作为展开集合', () => {
    const rows = flattenTree(tree, ['$'])
    expect(rows).toHaveLength(3)
  })

  it('叶子节点的 hasChildren 与 expanded 均为 false', () => {
    const rows = flattenTree(tree, ['$', '$.a'])
    const leaf = rows.find((row) => row.node.path === '$.c')
    expect(leaf.hasChildren).toBe(false)
    expect(leaf.expanded).toBe(false)
  })
})

describe('summarizeTree', () => {
  it('统计节点总数与最大深度', () => {
    // {"a":{"b":1},"c":2} → 根 + a + b + c 共 4 个节点，最深 2 层
    const tree = buildJsonTree('{"a":{"b":1},"c":2}')
    expect(summarizeTree(tree)).toEqual({ total: 4, leaves: 2, containers: 2, maxDepth: 2 })
  })

  it('数组统计项数', () => {
    // [1,2,3] → 根 + 3 项共 4 个节点，最深 1 层
    const tree = buildJsonTree('[1,2,3]')
    expect(summarizeTree(tree)).toEqual({ total: 4, leaves: 3, containers: 1, maxDepth: 1 })
  })

  it('叶子值的树只有自身', () => {
    expect(summarizeTree(buildJsonTree('"x"'))).toEqual({
      total: 1,
      leaves: 1,
      containers: 0,
      maxDepth: 0,
    })
  })

  it('容器数与叶子数之和等于总数', () => {
    const tree = buildJsonTree('{"a":[1,{"b":2}],"c":{"d":[3]}}')
    const stats = summarizeTree(tree)
    expect(stats.containers + stats.leaves).toBe(stats.total)
  })
})
