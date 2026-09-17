import { describe, it, expect } from 'vitest'
import {
  RECENT_LIMIT,
  consumeHomeNavigation,
  markHomeNavigation,
  pickAnchor,
  pushRecent,
  readRecentTools,
  readHomeFilter,
  readHomeAnchor,
  saveHomeFilter,
  saveHomeAnchor,
  clearHomeAnchor,
  recordRecentTool,
  clearRecentTools,
} from '@/common/utils/home-state'

describe('pushRecent', () => {
  it('新 id 置顶', () => {
    expect(pushRecent(['a', 'b'], 'c')).toEqual(['c', 'a', 'b'])
  })

  it('已存在的 id 提到最前且不重复', () => {
    expect(pushRecent(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c'])
  })

  it('超过上限时截断尾部', () => {
    const list = ['a', 'b', 'c', 'd']
    expect(pushRecent(list, 'e', 3)).toEqual(['e', 'a', 'b'])
    expect(pushRecent(list, 'e')).toEqual(['e', 'a', 'b', 'c'])
  })

  it('空 id / 非字符串元素被忽略，非数组输入安全兜底', () => {
    expect(pushRecent(['a'], '')).toEqual(['a'])
    expect(pushRecent(['a'], '   ')).toEqual(['a'])
    expect(pushRecent(null, 'x')).toEqual(['x'])
    expect(pushRecent([1, null, 'a', ''], 'b')).toEqual(['b', 'a'])
  })

  it('默认上限为 4', () => {
    const list = Array.from({ length: 20 }, (_, i) => `t${i}`)
    expect(pushRecent(list, 'new')).toEqual(['new', 't0', 't1', 't2'])
    expect(pushRecent(list, 'new')).toHaveLength(RECENT_LIMIT)
  })
})

describe('pickAnchor', () => {
  it('取 top ≤ 判定线的最后一个（即视口顶部所在分组），并记下偏移', () => {
    const candidates = [
      { anchor: 'recent', top: -520 },
      { anchor: 'group-convert', top: -36 },
      { anchor: 'group-dev', top: 420 },
    ]
    expect(pickAnchor(candidates, 12)).toEqual({ anchor: 'group-convert', offset: -36 })
  })

  it('恰好压线的锚点算命中（top = threshold）', () => {
    expect(pickAnchor([{ anchor: 'a', top: 12 }], 12)).toEqual({ anchor: 'a', offset: 12 })
  })

  it('所有锚点都在判定线之下时返回 null（视口停在 hero / 工具栏区域）', () => {
    expect(
      pickAnchor(
        [
          { anchor: 'a', top: 300 },
          { anchor: 'b', top: 800 },
        ],
        12
      )
    ).toBeNull()
  })

  it('空数组 / 非数组 / 非法元素安全兜底', () => {
    expect(pickAnchor([], 12)).toBeNull()
    expect(pickAnchor(null, 12)).toBeNull()
    expect(
      pickAnchor([{ anchor: '', top: -10 }, { top: -5 }, { anchor: 'ok', top: -1 }], 12)
    ).toEqual({ anchor: 'ok', offset: -1 })
  })

  it('单个锚点在视口上方时选中它', () => {
    expect(pickAnchor([{ anchor: 'only', top: -120 }], 12)).toEqual({
      anchor: 'only',
      offset: -120,
    })
  })
})

describe('导航来源标记（决定首页恢复锚点还是回顶部）', () => {
  it('默认不是 popstate 导航', () => {
    expect(consumeHomeNavigation()).toBe(false)
  })

  it('标记为 popstate 后可读到 true，且消费一次即复位', () => {
    markHomeNavigation(true)
    expect(consumeHomeNavigation()).toBe(true)
    expect(consumeHomeNavigation()).toBe(false)
  })

  it('站内导航标记为 false，读取仍返回 false', () => {
    markHomeNavigation(true)
    consumeHomeNavigation()
    markHomeNavigation(false)
    expect(consumeHomeNavigation()).toBe(false)
  })
})

describe('storage 兜底（node 环境无 localStorage/sessionStorage）', () => {
  it('读取返回默认值且不抛异常', () => {
    expect(readRecentTools()).toEqual([])
    expect(readHomeFilter()).toEqual({ keyword: '', category: 'all' })
    expect(readHomeAnchor()).toBeNull()
  })

  it('写入与清空在无 storage 时静默跳过', () => {
    expect(() => recordRecentTool('json')).not.toThrow()
    expect(() => clearRecentTools()).not.toThrow()
    expect(() => saveHomeFilter({ keyword: 'k', category: 'dev' })).not.toThrow()
    expect(() => saveHomeAnchor({ anchor: 'group-dev', offset: -20 })).not.toThrow()
    expect(() => clearHomeAnchor()).not.toThrow()
  })
})
