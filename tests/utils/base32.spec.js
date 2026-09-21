import { describe, expect, it } from 'vitest'
import {
  base32Decode,
  base32ToText,
  bytesToBase32,
  cleanBase32,
  isValidBase32,
  textToBase32,
} from '@/common/utils/base32'

// RFC 4648 风格测试向量，逐条与 Python 标准库 base64.b32encode 核对过。
// （凭记忆手写这张表会出错：fob 的正确结果是 MZXWE===，不是常被引用的 MZXW6YQ=）
const RFC_VECTORS = [
  ['', ''],
  ['f', 'MY======'],
  ['fo', 'MZXQ===='],
  ['foo', 'MZXW6==='],
  ['fob', 'MZXWE==='],
  ['fobo', 'MZXWE3Y='],
  ['folb', 'MZXWYYQ='],
  ['foobar', 'MZXW6YTBOI======'],
]

describe('textToBase32（与标准库核对的向量）', () => {
  it.each(RFC_VECTORS)('编码 %o → %o', (text, expected) => {
    expect(textToBase32(text)).toBe(expected)
  })

  it('padding=false 时省略尾部 =', () => {
    expect(textToBase32('foo', { padding: false })).toBe('MZXW6')
    expect(textToBase32('foobar', { padding: false })).toBe('MZXW6YTBOI')
  })

  it('UTF-8 中文与 emoji 往返不失真', () => {
    const text = '中文测试 🎉 PocketBox'
    expect(base32ToText(textToBase32(text))).toBe(text)
  })

  it('空串编码为空串', () => {
    expect(textToBase32('')).toBe('')
  })
})

describe('base32Decode', () => {
  it.each(RFC_VECTORS.filter(([text]) => text))('解码 %o ← %o', (expected, encoded) => {
    expect(base32ToText(encoded)).toBe(expected)
  })

  it('容忍空格 / 连字符 / 小写 / 缺 padding', () => {
    const seed = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
    const messy = 'gezd gnbv-gy3t qojq gezdgnbvgy3tqojq===='
    expect(Array.from(base32Decode(messy))).toEqual(Array.from(base32Decode(seed)))
  })

  it('RFC 6238 种子解出原始 ASCII 字节', () => {
    const bytes = base32Decode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
    expect(new TextDecoder().decode(bytes)).toBe('12345678901234567890')
    expect(bytes).toHaveLength(20)
  })

  it('空内容与非法字符抛出中文错误', () => {
    expect(() => base32Decode('')).toThrow('Base32 内容为空')
    expect(() => base32Decode('   ')).toThrow('Base32 内容为空')
    expect(() => base32Decode('ABC1DEF')).toThrow(/非法字符/)
  })

  it('末尾不足 8 位的残余比特被丢弃，不产出字节', () => {
    // 'M' 只有 5 位，凑不出一个字节
    expect(base32Decode('M')).toHaveLength(0)
  })
})

describe('bytesToBase32', () => {
  it('接受普通数组', () => {
    expect(bytesToBase32([102, 111, 111])).toBe('MZXW6===')
  })

  it('单字节 0x00 不能被当成空输入', () => {
    expect(bytesToBase32(new Uint8Array([0]))).toBe('AA======')
  })
})

describe('cleanBase32', () => {
  it('大写化、去空白与连字符、去尾部 padding', () => {
    expect(cleanBase32('mzxw6=== ')).toBe('MZXW6')
    expect(cleanBase32('GEZD-GNBV GY3T')).toBe('GEZDGNBVGY3T')
  })
})

describe('isValidBase32', () => {
  it('合法串返回 true（含缺 padding 与小写）', () => {
    expect(isValidBase32('MZXW6===')).toBe(true)
    expect(isValidBase32('mzxw6')).toBe(true)
    expect(isValidBase32('GEZD-GNBV-GY3T-QOJQ')).toBe(true)
  })

  it('含 0/1/8/9 等非法字母返回 false', () => {
    expect(isValidBase32('MZXW61')).toBe(false)
    expect(isValidBase32('abc0defg')).toBe(false)
  })

  it('长度合法性与编码器实际产出一致（防校验器与编码器各自漂移）', () => {
    const produced = new Set()
    for (let n = 1; n <= 40; n++) {
      produced.add(bytesToBase32(new Uint8Array(n), { padding: false }).length)
    }
    for (let len = 1; len <= 20; len++) {
      expect(isValidBase32('A'.repeat(len)), `长度 ${len}`).toBe(produced.has(len))
    }
  })

  it('余数 1 / 3 / 6 的长度不可能由整数字节编出，判非法', () => {
    for (const len of [1, 3, 6, 9, 11, 14]) {
      expect(isValidBase32('A'.repeat(len)), `长度 ${len}`).toBe(false)
    }
  })

  it('空串、纯空白、只有 padding 都返回 false', () => {
    expect(isValidBase32('')).toBe(false)
    expect(isValidBase32('   ')).toBe(false)
    expect(isValidBase32('====')).toBe(false)
  })
})

describe('字节序列往返一致性', () => {
  it('编码→解码复原（覆盖各余数长度）', () => {
    for (const size of [1, 2, 3, 4, 5, 7, 8, 16, 33]) {
      const bytes = Uint8Array.from({ length: size }, (_, i) => (i * 37 + 11) % 256)
      expect(Array.from(base32Decode(bytesToBase32(bytes)))).toEqual(Array.from(bytes))
    }
  })
})
