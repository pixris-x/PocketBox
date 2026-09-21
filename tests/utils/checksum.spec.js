import { describe, expect, it } from 'vitest'
import {
  adler32,
  crc32,
  detectIsbn,
  isbn10CheckDigit,
  isbn10Valid,
  isbn13CheckDigit,
  isbn13Valid,
  isbnValid,
  luhnCheckDigit,
  luhnValid,
  toHex,
} from '@/common/utils/checksum'

// CRC32 / Adler32 期望值全部由 Python 标准库 zlib.crc32 / zlib.adler32 生成，
// 不要凭记忆改这张表（adler32("123456789") 是 0x091E01DE，不是 0x091E0189）。
const HASH_VECTORS = [
  { text: '', crc: 0x00000000, adler: 0x00000001 },
  { text: '123456789', crc: 0xcbf43926, adler: 0x091e01de },
  {
    text: 'The quick brown fox jumps over the lazy dog',
    crc: 0x414fa339,
    adler: 0x5bdc0fda,
  },
  { text: 'hello world', crc: 0x0d4a1185, adler: 0x1a0b045d },
  { text: '中文测试', crc: 0x48b37900, adler: 0x39a1089f },
  { text: 'a'.repeat(1000), crc: 0x9a38da03, adler: 0xf9d87af8 },
]

describe('crc32', () => {
  it.each(HASH_VECTORS)('与 zlib 一致：$text', ({ text, crc }) => {
    expect(crc32(text)).toBe(crc)
  })

  it('空串是 0（不是 0xFFFFFFFF）', () => {
    expect(crc32('')).toBe(0)
  })

  it('字符串与等价 UTF-8 字节结果相同', () => {
    expect(crc32(new TextEncoder().encode('中文'))).toBe(crc32('中文'))
  })

  it('接受普通数组', () => {
    expect(crc32([104, 105])).toBe(crc32('hi'))
  })

  it('始终返回无符号 32 位', () => {
    for (const { text } of HASH_VECTORS) {
      const value = crc32(text)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(0xffffffff)
    }
  })
})

describe('adler32', () => {
  it.each(HASH_VECTORS)('与 zlib 一致：$text', ({ text, adler }) => {
    expect(adler32(text)).toBe(adler)
  })

  it('空串是 1', () => {
    expect(adler32('')).toBe(1)
  })
})

describe('toHex', () => {
  it('定长补零并默认大写', () => {
    expect(toHex(0xcbf43926)).toBe('CBF43926')
    expect(toHex(1)).toBe('00000001')
  })

  it('可关大写', () => {
    expect(toHex(255, { upper: false })).toBe('000000ff')
  })
})

describe('luhn', () => {
  it('已知合法号码', () => {
    expect(luhnValid('4242424242424242')).toBe(true)
    expect(luhnValid('79927398770')).toBe(true)
  })

  it('末位改一位即不合法', () => {
    expect(luhnValid('4242424242424243')).toBe(false)
  })

  it('容忍空格与连字符分隔', () => {
    expect(luhnValid('4242 4242-4242 4242')).toBe(true)
  })

  it('校验位与参考实现逐条一致', () => {
    // 期望值由独立 Python 实现生成
    const cases = [
      ['7992739877', 0],
      ['123456782', 2],
      ['787789328792174', 9],
      ['218096792908100', 6],
      ['339075793834701', 7],
      ['746814538401916', 5],
      ['146100330766619', 2],
      ['345145061231007', 3],
    ]
    for (const [payload, digit] of cases) {
      expect(luhnCheckDigit(payload), payload).toBe(digit)
      // 自洽性：补上算出的校验位后必须通过校验
      expect(luhnValid(payload + digit)).toBe(true)
    }
  })

  it('奇数长度主干的加倍起点不能写反', () => {
    // 期望值由独立 Python 实现生成：主干长度奇偶不同，被加倍的下标集合也不同
    expect(luhnCheckDigit('799273987')).toBe(5)
    expect(luhnValid('7992739875')).toBe(true)
    expect(luhnCheckDigit('424242424242424')).toBe(2)
    expect(luhnValid('4242424242424242')).toBe(true)
  })

  it('过短与非法输入', () => {
    expect(luhnValid('5')).toBe(false)
    expect(() => luhnValid('')).toThrow('号码为空')
    expect(() => luhnCheckDigit('12a4')).toThrow(/非数字/)
  })
})

describe('isbn', () => {
  it('ISBN-10 校验位', () => {
    expect(isbn10CheckDigit('030640615')).toBe('2')
    expect(isbn10CheckDigit('048665088')).toBe('X')
  })

  it('ISBN-10 校验', () => {
    expect(isbn10Valid('0-306-40615-2')).toBe(true)
    expect(isbn10Valid('048665088X')).toBe(true)
    expect(isbn10Valid('0306406153')).toBe(false)
  })

  it('ISBN-13 校验位与校验', () => {
    expect(isbn13CheckDigit('978030640615')).toBe(7)
    expect(isbn13CheckDigit('978711554608')).toBe(1)
    expect(isbn13Valid('978-0-306-40615-7')).toBe(true)
    expect(isbn13Valid('9780306406158')).toBe(false)
  })

  it('自动识别类型', () => {
    expect(detectIsbn('0306406152')).toBe('isbn10')
    expect(detectIsbn('9780306406157')).toBe('isbn13')
    expect(detectIsbn('123')).toBeNull()
    expect(isbnValid('9780306406157')).toBe(true)
    expect(isbnValid('0306406152')).toBe(true)
    expect(isbnValid('abcdefg')).toBe(false)
  })

  it('位数不对时抛错并说明需要几位', () => {
    expect(() => isbn10CheckDigit('123')).toThrow(/9 位/)
    expect(() => isbn13CheckDigit('123456')).toThrow(/12 位/)
    expect(() => isbn10CheckDigit('')).toThrow(/为空/)
  })
})
