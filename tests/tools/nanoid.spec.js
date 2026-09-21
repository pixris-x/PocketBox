import { describe, expect, it } from 'vitest'
import {
  ALPHABETS,
  ALPHABET_OPTIONS,
  alphabetSize,
  generateId,
  generateIds,
  groupBy,
  pickFromBytes,
} from '@/views/tools/random/components/NanoidPanel/scripts/generator'

describe('字母表定义', () => {
  it('每个字母表内部无重复字符', () => {
    for (const [key, alphabet] of Object.entries(ALPHABETS)) {
      expect(new Set(alphabet).size, `${key} 含重复字符`).toBe(alphabet.length)
    }
  })

  it('长度符合预期（标准 NanoID 字母表为 64）', () => {
    expect(alphabetSize('standard')).toBe(64)
    expect(alphabetSize('alnum')).toBe(62)
    expect(alphabetSize('lower')).toBe(36)
    expect(alphabetSize('hex')).toBe(16)
    expect(alphabetSize('digits')).toBe(10)
  })

  it('选项里的 value 都能在 ALPHABETS 找到', () => {
    for (const option of ALPHABET_OPTIONS) {
      expect(alphabetSize(option.value), `选项 ${option.value} 无对应字母表`).toBeGreaterThan(0)
    }
  })

  it('未知键名返回 0', () => {
    expect(alphabetSize('nope')).toBe(0)
  })
})

describe('pickFromBytes（拒绝采样）', () => {
  it('64 长度字母表下 256 整除，任何字节都不被拒绝', () => {
    const bytes = Uint8Array.from(Array.from({ length: 8 }, (_, i) => 200 + i))
    const { chars, used } = pickFromBytes(bytes, ALPHABETS.standard, 8)
    expect(used).toBe(8)
    expect(chars).toHaveLength(8)
  })

  it('非整除字母表会拒掉尾部区间的字节（避免分布偏置）', () => {
    // 10 字符字母表：limit = 256 - 256%10 = 250，故 250~255 应被拒绝
    const bytes = Uint8Array.from([250, 251, 255, 0, 1])
    const { chars, used } = pickFromBytes(bytes, ALPHABETS.digits, 2)
    expect(used).toBe(5)
    expect(chars).toBe('01')
  })

  it('取满 count 后立即停止，不多消费字节', () => {
    const bytes = Uint8Array.from([0, 1, 2, 3, 4])
    expect(pickFromBytes(bytes, ALPHABETS.digits, 2)).toEqual({ chars: '01', used: 2 })
  })

  it('字节不够时返回已取到的部分', () => {
    const { chars, used } = pickFromBytes(Uint8Array.from([255, 254]), ALPHABETS.digits, 5)
    expect(chars).toBe('')
    expect(used).toBe(2)
  })

  it('count 为 0 直接返回空', () => {
    expect(pickFromBytes(Uint8Array.from([1, 2]), ALPHABETS.hex, 0)).toEqual({ chars: '', used: 0 })
  })

  it('产出字符一定落在字母表内', () => {
    const bytes = crypto.getRandomValues(new Uint8Array(500))
    for (const key of Object.keys(ALPHABETS)) {
      const { chars } = pickFromBytes(bytes, ALPHABETS[key], 100)
      for (const ch of chars) expect(ALPHABETS[key]).toContain(ch)
    }
  })
})

describe('groupBy', () => {
  it('按长度切片并用分隔符连接', () => {
    expect(groupBy('abcdefghij', 5)).toBe('abcde-fghij')
  })

  it('不能整除时末组保留余数', () => {
    expect(groupBy('abcdefg', 3, ' ')).toBe('abc def g')
  })

  it('size 小于 1 或不小于整串长度时原样返回', () => {
    expect(groupBy('abcde', 0)).toBe('abcde')
    expect(groupBy('abc', 3)).toBe('abc')
    expect(groupBy('abc', 10)).toBe('abc')
  })
})

describe('generateId', () => {
  it('长度与字母表符合参数', () => {
    const id = generateId({ size: 24, alphabetKey: 'hex' })
    expect(id).toHaveLength(24)
    expect(/^[0-9a-f]+$/.test(id)).toBe(true)
  })

  it('分组后字符数不变、多出分隔符', () => {
    const id = generateId({ size: 20, alphabetKey: 'digits', groupSize: 5 })
    expect(id).toMatch(/^\d{5}-\d{5}-\d{5}-\d{5}$/)
  })

  it('默认参数可直接产出 21 位', () => {
    expect(generateId()).toHaveLength(21)
  })

  it('两次调用几乎不可能相同（碰撞概率可忽略）', () => {
    expect(generateId({ size: 21 })).not.toBe(generateId({ size: 21 }))
  })

  it('未知字母表与非法长度抛错', () => {
    expect(() => generateId({ alphabetKey: 'nope' })).toThrow(/未知字母表/)
    expect(() => generateId({ size: 0 })).toThrow(/长度/)
    expect(() => generateId({ size: 1.5 })).toThrow(/长度/)
    expect(() => generateId({ size: 99999 })).toThrow(/长度/)
  })
})

describe('generateIds', () => {
  it('产出指定数量且互不相同', () => {
    const list = generateIds(12, { size: 12, alphabetKey: 'standard' })
    expect(list).toHaveLength(12)
    expect(new Set(list).size).toBe(12)
  })

  it('数量为 0 时返回空数组', () => {
    expect(generateIds(0)).toEqual([])
  })
})
