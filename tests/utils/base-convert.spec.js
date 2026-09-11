import { describe, expect, it } from 'vitest'
import {
  BASE_PRESETS,
  convertBase,
  convertToAllCommon,
  formatInBase,
  parseInBase,
} from '@/common/utils/base-convert'

const errMsg = (fn) => {
  try {
    fn()
  } catch (e) {
    return e.message
  }
  return null
}

describe('parseInBase / formatInBase 基本往返', () => {
  it.each([
    ['0', 10, 0n],
    ['1', 10, 1n],
    ['42', 10, 42n],
    ['ff', 16, 255n],
    ['FF', 16, 255n],
    ['1010', 2, 10n],
    ['777', 8, 511n],
    ['-100', 10, -100n],
    ['+ff', 16, 255n],
    ['0', 2, 0n],
    ['1_000_000', 10, 1000000n],
  ])('parseInBase(%j, %d)', (input, base, expected) => {
    expect(parseInBase(input, base)).toBe(expected)
  })

  it.each([
    [0n, 2, '0'],
    [0n, 16, '0'],
    [10n, 2, '1010'],
    [255n, 16, 'ff'],
    [-1n, 2, '-1'],
    [35n, 36, 'z'],
    [36n, 36, '10'],
    [BigInt('123456789012345678901234567890'), 16, '18ee90ff6c373e0ee4e3f0ad2'],
  ])('formatInBase(%s, %d)', (value, base, expected) => {
    const actual = formatInBase(value, base)
    if (expected === null) {
      expect(actual.length).toBeGreaterThan(0)
    } else {
      expect(actual).toBe(expected)
    }
  })
})

describe('convertBase 跨进制', () => {
  it.each([
    ['ff', 16, 2, '11111111'],
    ['ff', 16, 8, '377'],
    ['ff', 16, 10, '255'],
    ['100', 10, 16, '64'],
    ['z', 36, 10, '35'],
    ['377', 8, 16, 'ff'],
    ['0', 10, 2, '0'],
    ['-1', 10, 2, '-1'],
  ])('convertBase(%j, %d, %d) = %j', (input, from, to, expected) => {
    expect(convertBase(input, from, to)).toBe(expected)
  })
})

describe('前缀自动剥离（与进制一致时）', () => {
  it.each([
    ['0xFF', 16, 255n],
    ['0Xff', 16, 255n],
    ['0b1010', 2, 10n],
    ['0B1010', 2, 10n],
    ['0o777', 8, 511n],
    ['0O777', 8, 511n],
  ])('%j in base %d', (input, base, expected) => {
    expect(parseInBase(input, base)).toBe(expected)
  })

  it('不一致的前缀不会破坏解析（视为非法字符）', () => {
    // 0x 在十进制下：x 是非法字符
    expect(errMsg(() => parseInBase('0x10', 10))).toMatch(/字符「x」不属于 10 进制/)
  })
})

describe('convertToAllCommon', () => {
  it('一次返回 2/8/10/16', () => {
    expect(convertToAllCommon('255', 10)).toEqual({
      2: '11111111',
      8: '377',
      10: '255',
      16: 'ff',
    })
  })

  it('支持负数', () => {
    expect(convertToAllCommon('-1', 10)).toEqual({
      2: '-1',
      8: '-1',
      10: '-1',
      16: '-1',
    })
  })
})

describe('大整数（超过 2^53 也不会丢精度）', () => {
  it('64 位十六进制互转不丢', () => {
    const hex = 'ffffffffffffffff' // 2^64 - 1
    const dec = convertBase(hex, 16, 10)
    expect(BigInt(dec)).toBe(BigInt('18446744073709551615'))
    expect(convertBase(dec, 10, 16)).toBe(hex)
  })

  it('2^100 在 2/16 间往返', () => {
    const big = 1n << 100n
    const hex = formatInBase(big, 16)
    expect(convertBase(hex, 16, 2)).toBe(formatInBase(big, 2))
  })
})

describe('错误信息可读', () => {
  it('空输入', () => {
    expect(errMsg(() => parseInBase('', 10))).toBe('输入不能为空')
    expect(errMsg(() => parseInBase('   ', 16))).toBe('输入不能为空')
  })

  it('只有正负号', () => {
    expect(errMsg(() => parseInBase('-', 10))).toMatch(/正负号后必须有数字/)
  })

  it('非法字符', () => {
    expect(errMsg(() => parseInBase('12a', 10))).toMatch(/字符「a」不属于 10 进制/)
    expect(errMsg(() => parseInBase('1G', 16))).toMatch(/字符「G」不属于 16 进制/)
  })

  it('进制越界', () => {
    expect(errMsg(() => parseInBase('1', 1))).toMatch(/必须在 2 到 36 之间/)
    expect(errMsg(() => parseInBase('1', 37))).toMatch(/必须在 2 到 36 之间/)
    expect(errMsg(() => parseInBase('1', 2.5))).toMatch(/必须在 2 到 36 之间/)
  })

  it('只有下划线', () => {
    expect(errMsg(() => parseInBase('___', 10))).toBe('输入不能为空')
  })
})

describe('BASE_PRESETS', () => {
  it('包含 2/8/10/16 四个常用进制', () => {
    expect(BASE_PRESETS.map((p) => p.value)).toEqual([2, 8, 10, 16])
  })
})
