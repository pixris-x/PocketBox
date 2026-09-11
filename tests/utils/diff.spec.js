import { describe, expect, it } from 'vitest'
import { diffText } from '@/common/utils/diff'

const types = (result) => result.rows.map((row) => row.type)

describe('diffText 基本对照', () => {
  it('完全相同', () => {
    const result = diffText('a\nb\nc', 'a\nb\nc')
    expect(types(result)).toEqual(['equal', 'equal', 'equal'])
    expect(result.stats).toEqual({ added: 0, removed: 0, same: 3 })
  })

  it('中间一行被替换', () => {
    const result = diffText('a\nb', 'a\nc')
    expect(types(result)).toEqual(['equal', 'remove', 'add'])
    expect(result.stats).toEqual({ added: 1, removed: 1, same: 1 })
  })

  it('右侧新增行', () => {
    const result = diffText('a', 'a\nb')
    expect(types(result)).toEqual(['equal', 'add'])
    expect(result.stats).toEqual({ added: 1, removed: 0, same: 1 })
  })

  it('左侧删除行', () => {
    const result = diffText('a\nb', 'a')
    expect(types(result)).toEqual(['equal', 'remove'])
    expect(result.stats).toEqual({ added: 0, removed: 1, same: 1 })
  })

  it('左右内容取自各自原文（不串行）', () => {
    const result = diffText('a\nb', 'a\nc')
    expect(result.rows[1]).toMatchObject({ type: 'remove', leftText: 'b' })
    expect(result.rows[2]).toMatchObject({ type: 'add', rightText: 'c' })
  })

  it('CRLF 与 LF 视为相同', () => {
    expect(diffText('a\r\nb', 'a\nb').stats).toEqual({ added: 0, removed: 0, same: 2 })
  })

  it('两段空文本也产出一行对照', () => {
    const result = diffText('', '')
    expect(result.rows).toHaveLength(1)
    expect(result.stats.same).toBe(1)
  })
})

describe('diffText 行号', () => {
  it('为存在的行分配行号，缺失的一侧为 null', () => {
    const { rows } = diffText('a\nb', 'a')
    expect(rows[0]).toMatchObject({ type: 'equal', leftNum: 1, rightNum: 1 })
    expect(rows[1]).toMatchObject({ type: 'remove', leftNum: 2, rightNum: null })
  })

  it('空行同样占用行号（回归：曾把空行当作「无行」）', () => {
    const { rows } = diffText('a\n\nb', 'a\n\nb')
    expect(rows.map((row) => row.leftNum)).toEqual([1, 2, 3])
    expect(rows.map((row) => row.rightNum)).toEqual([1, 2, 3])
  })

  it('新增行的左侧没有行号', () => {
    const { rows } = diffText('a', 'a\nb')
    expect(rows[1]).toMatchObject({ type: 'add', leftNum: null, rightNum: 2 })
  })
})

describe('diffText 忽略选项', () => {
  it('默认区分大小写', () => {
    expect(diffText('A', 'a').stats).toEqual({ added: 1, removed: 1, same: 0 })
  })

  it('ignoreCase 后视为相同', () => {
    expect(diffText('A', 'a', { ignoreCase: true }).stats).toEqual({
      added: 0,
      removed: 0,
      same: 1,
    })
  })

  it('默认区分空白', () => {
    expect(diffText('a b', 'ab').stats).toEqual({ added: 1, removed: 1, same: 0 })
  })

  it('ignoreWhitespace 后视为相同', () => {
    expect(diffText('a b', 'ab', { ignoreWhitespace: true }).stats).toEqual({
      added: 0,
      removed: 0,
      same: 1,
    })
  })

  it('两个选项可同时生效', () => {
    expect(diffText('A B', 'ab', { ignoreCase: true, ignoreWhitespace: true }).stats).toEqual({
      added: 0,
      removed: 0,
      same: 1,
    })
  })
})

describe('diffText 超长文本退化为逐行对照', () => {
  it('超过 maxLines 时不再做 LCS，按位置逐行比较', () => {
    const result = diffText('a\nb\nc', 'a\nX\nc', { maxLines: 2 })
    expect(types(result)).toEqual(['equal', 'change', 'equal'])
  })

  it('退化路径下 change 不计入新增与删除', () => {
    const result = diffText('a\nb\nc', 'a\nX\nc', { maxLines: 2 })
    expect(result.stats).toEqual({ added: 0, removed: 0, same: 2 })
  })

  it('退化路径下长度不同时用 remove / add 补齐', () => {
    const result = diffText('a\nb\nc', 'a\nb', { maxLines: 1 })
    expect(types(result)).toEqual(['equal', 'equal', 'remove'])
    expect(result.stats).toEqual({ added: 0, removed: 1, same: 2 })
  })

  it('未超上限时仍走 LCS', () => {
    const result = diffText('a\nb\nc', 'a\nX\nc', { maxLines: 100 })
    expect(types(result)).toEqual(['equal', 'remove', 'add', 'equal'])
  })
})
