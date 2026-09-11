import { describe, expect, it } from 'vitest'
import { decodeComponent, encodeComponent, looksEncoded } from '@/common/utils/url'

describe('encodeComponent', () => {
  it('空格编码为 %20', () => {
    expect(encodeComponent('a b')).toBe('a%20b')
  })

  it('中文按 UTF-8 编码', () => {
    expect(encodeComponent('中文')).toBe('%E4%B8%AD%E6%96%87')
  })

  it('默认不转义 RFC3986 保留字符', () => {
    expect(encodeComponent("!'()*")).toBe("!'()*")
  })

  it('encodeAll 时连保留字符一起转义', () => {
    expect(encodeComponent("!'()*", { encodeAll: true })).toBe('%21%27%28%29%2A')
  })

  it('十六进制大写', () => {
    expect(encodeComponent('中', { encodeAll: true })).toBe('%E4%B8%AD')
  })
})

describe('decodeComponent', () => {
  it('解码 %20', () => {
    expect(decodeComponent('a%20b')).toMatchObject({ ok: true, value: 'a b' })
  })

  it('把 + 当作空格（兼容查询串）', () => {
    expect(decodeComponent('a+b')).toMatchObject({ ok: true, value: 'a b' })
  })

  it('解码中文', () => {
    expect(decodeComponent('%E4%B8%AD')).toMatchObject({ ok: true, value: '中' })
  })

  it('非法转义序列返回 ok:false 并给出提示', () => {
    const result = decodeComponent('%E4%B8')
    expect(result.ok).toBe(false)
    expect(result.value).toBe('')
    expect(result.error).toContain('非法的 % 转义序列')
  })

  it('非十六进制字符也判为非法', () => {
    expect(decodeComponent('%ZZ').ok).toBe(false)
  })
})

describe('looksEncoded', () => {
  it('含 %XX 序列判为已编码', () => {
    expect(looksEncoded('%E4%B8%AD')).toBe(true)
    expect(looksEncoded('a%20b')).toBe(true)
  })

  it('普通文本判为未编码', () => {
    expect(looksEncoded('hello world')).toBe(false)
    expect(looksEncoded('中')).toBe(false)
  })

  it('单独的 % 不算已编码', () => {
    expect(looksEncoded('100%')).toBe(false)
    expect(looksEncoded('a%z')).toBe(false)
  })
})

describe('编码解码往返一致性', () => {
  it('中文与符号混合文本往返不失真', () => {
    const text = '中文 & test=1 / 路径?x=y'
    expect(decodeComponent(encodeComponent(text)).value).toBe(text)
  })

  it('encodeAll 后的结果同样能解回原文', () => {
    const text = "!'()* 中文"
    expect(decodeComponent(encodeComponent(text, { encodeAll: true })).value).toBe(text)
  })
})
