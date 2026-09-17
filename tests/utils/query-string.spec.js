import { describe, it, expect } from 'vitest'
import { parseQuery, buildQuery } from '@/common/utils/query-string'

describe('parseQuery', () => {
  it('完整 URL 拆出查询串并解码，+ 按空格处理', () => {
    const result = parseQuery('https://a.com/search?q=%E4%B8%AD%E6%96%87&x=a+b#top')
    expect(result.ok).toBe(true)
    expect(result.base).toBe('https://a.com/search')
    expect(result.pairs).toEqual([
      { key: 'q', value: '中文' },
      { key: 'x', value: 'a b' },
    ])
  })

  it('裸查询串（带或不带 ?）与空值片段', () => {
    expect(parseQuery('a=1&b=2').pairs).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: '2' },
    ])
    expect(parseQuery('?flag&x=').pairs).toEqual([
      { key: 'flag', value: '' },
      { key: 'x', value: '' },
    ])
  })

  it('值里再出现 = 只按第一个切分', () => {
    expect(parseQuery('redirect=/a?b=c')).toEqual({
      ok: true,
      base: '',
      pairs: [{ key: 'redirect', value: '/a?b=c' }],
      count: 1,
    })
  })

  it('空输入与无查询串的 URL', () => {
    expect(parseQuery('').ok).toBe(false)
    expect(parseQuery('   ').ok).toBe(false)
    expect(parseQuery('https://a.com/path')).toMatchObject({ ok: true, pairs: [] })
  })

  it('无效百分号编码报中文错误', () => {
    const result = parseQuery('a=%zz')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('无效')
  })
})

describe('buildQuery', () => {
  it('键值都做 encodeURIComponent，空值只留键', () => {
    expect(
      buildQuery([
        { key: 'q', value: '中文' },
        { key: 'flag', value: '' },
        { key: 'x', value: 'a b' },
      ])
    ).toBe('?q=%E4%B8%AD%E6%96%87&flag&x=a%20b')
  })

  it('withQuestionMark=false 与空数组', () => {
    expect(buildQuery([{ key: 'a', value: '1' }], false)).toBe('a=1')
    expect(buildQuery([])).toBe('')
  })

  it('parse → build → parse 往返一致', () => {
    const source = 'https://a.com/p?name=%E5%BC%A0%E4%B8%89&tag=go+go'
    const parsed = parseQuery(source)
    const rebuilt = buildQuery(parsed.pairs)
    const reparsed = parseQuery(`https://a.com/p${rebuilt}`)
    expect(reparsed.pairs).toEqual(parsed.pairs)
  })
})
