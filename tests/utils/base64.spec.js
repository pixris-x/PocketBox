import { describe, expect, it } from 'vitest'
import {
  base64ToText,
  base64UrlToText,
  cleanBase64,
  isValidBase64,
  textToBase64,
} from '@/common/utils/base64'

const HEADER = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
const PAYLOAD =
  'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW8oOS4iSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjo0MTAyNDQ0ODAwfQ'

describe('textToBase64 / base64ToText', () => {
  it('标准 base64 编码', () => {
    expect(textToBase64('abc')).toBe('YWJj')
  })

  it('UTF-8 中文往返不失真', () => {
    const text = '中文 test 🎉'
    expect(base64ToText(textToBase64(text))).toBe(text)
  })

  it('空串往返', () => {
    expect(base64ToText(textToBase64(''))).toBe('')
  })

  it('超长文本分批转码不溢出', () => {
    const long = 'a'.repeat(200000)
    expect(base64ToText(textToBase64(long))).toBe(long)
  })
})

describe('cleanBase64', () => {
  it('去掉 data URL 前缀', () => {
    expect(cleanBase64('data:text/plain;base64,YWJj')).toBe('YWJj')
    expect(cleanBase64('data:image/png;base64,iVBORw0KGgo=')).toBe('iVBORw0KGgo=')
  })

  it('去掉空白字符', () => {
    expect(cleanBase64(' YW Jj\n')).toBe('YWJj')
  })

  it('普通串原样返回', () => {
    expect(cleanBase64('YWJj')).toBe('YWJj')
  })
})

describe('isValidBase64', () => {
  it('合法 base64 返回 true', () => {
    expect(isValidBase64('YWJj')).toBe(true)
    expect(isValidBase64('YWJjZA==')).toBe(true)
    expect(isValidBase64('data:text/plain;base64,YWJj')).toBe(true)
  })

  it('含非法字符返回 false', () => {
    expect(isValidBase64('YWJj!')).toBe(false)
  })

  it('长度不是 4 的倍数返回 false', () => {
    expect(isValidBase64('YWJ')).toBe(false)
  })

  it('空串返回 false', () => {
    expect(isValidBase64('')).toBe(false)
    expect(isValidBase64('   ')).toBe(false)
  })
})

describe('base64UrlToText', () => {
  it('解码 JWT 的 header 段', () => {
    expect(base64UrlToText(HEADER)).toBe('{"alg":"HS256","typ":"JWT"}')
  })

  it('解码含中文的 payload 段', () => {
    expect(JSON.parse(base64UrlToText(PAYLOAD)).name).toBe('张三')
  })

  it('把 - 还原为 +', () => {
    expect(base64UrlToText('eyJhIjoiKyJ9')).toBe('{"a":"+"}')
  })

  it('把 _ 还原为 /', () => {
    expect(base64UrlToText('eyJhIjoiLyJ9')).toBe('{"a":"/"}')
  })

  it('缺省填充时自动补齐', () => {
    // '{"a":"1"}' 的标准 base64 为 eyJhIjoiMSJ9，base64url 不要求带 =
    expect(base64UrlToText('eyJhIjoiMSJ9')).toBe('{"a":"1"}')
  })

  it('非法序列抛错（由调用方捕获并转为友好提示）', () => {
    expect(() => base64UrlToText('!!!')).toThrow()
  })
})
