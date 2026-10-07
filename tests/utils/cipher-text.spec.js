import { describe, expect, it } from 'vitest'
import {
  BASE58_ALPHABET,
  MORSE_GAPS,
  caesarShift,
  morseToText,
  rot13,
  rot13LooksReadable,
  textToMorse,
  base58Decode,
  base58Encode,
} from '@/common/utils/cipher-text'

describe('caesarShift 凯撒移位', () => {
  it('只移动字母，保留大小写', () => {
    expect(caesarShift('Hello', 3)).toBe('Khoor')
    expect(caesarShift('Zebra', 1)).toBe('Afcsb')
  })

  it('数字、标点、中文原样保留', () => {
    // 关键：按码位整串加会把中文和标点一起挪成乱码
    expect(caesarShift('Hello, World! 123', 3)).toBe('Khoor, Zruog! 123')
    expect(caesarShift('中文abc', 5)).toBe('中文fgh')
  })

  it('支持负位移且与模 26 等价', () => {
    expect(caesarShift('Khoor', -3)).toBe('Hello')
    expect(caesarShift('Hello', 29)).toBe(caesarShift('Hello', 3))
    expect(caesarShift('Hello', 26)).toBe('Hello')
    expect(caesarShift('Hello', 0)).toBe('Hello')
  })

  it('空输入与空位移', () => {
    expect(caesarShift('', 5)).toBe('')
    expect(caesarShift('abc', 0)).toBe('abc')
  })
})

describe('rot13', () => {
  it('位移 13 且自反', () => {
    expect(rot13('Hello, World! 123')).toBe('Uryyb, Jbeyq! 123')
    // 自反是 ROT13 的关键性质：不需要密钥，转两次回原文
    expect(rot13(rot13('Hello, World!'))).toBe('Hello, World!')
  })

  it('可读性启发式', () => {
    expect(rot13LooksReadable('The quick brown fox')).toBe(true)
    expect(rot13LooksReadable('!!!???')).toBe(false)
    expect(rot13LooksReadable('')).toBe(false)
  })
})

describe('textToMorse / morseToText', () => {
  it('编码字母与数字', () => {
    expect(textToMorse('SOS')).toBe('... / --- / ...')
    expect(textToMorse('100')).toBe('.---- / ----- / -----')
  })

  it('编码空格分隔单词', () => {
    expect(textToMorse('SOS 100')).toBe('... / --- / ...  .---- / ----- / -----')
  })

  it('无法编码的字符标为 ? 而非丢弃', () => {
    expect(textToMorse('中文')).toBe('? / ?')
  })

  it('可往返', () => {
    for (const text of ['SOS', 'HELLO WORLD', 'A1 B2', 'TEST 123']) {
      expect(morseToText(textToMorse(text))).toBe(text)
    }
  })

  it('解码容忍 / 与空格两种字母分隔', () => {
    expect(morseToText('... / --- / ...')).toBe('SOS')
    expect(morseToText('... --- ...')).toBe('SOS')
    // 双空格分词
    expect(morseToText('... --- ...  .---- ----- -----')).toBe('SOS 100')
  })

  it('非法码返回 ? 不抛错', () => {
    expect(morseToText('.....-.-.-.-.')).toBe('?')
    expect(morseToText('')).toBe('')
  })

  it('自定义分隔符', () => {
    expect(textToMorse('AB', { letterGap: '|', wordGap: '//' })).toBe('.-|-...')
  })

  it('默认分隔符常量的形态', () => {
    expect(MORSE_GAPS.letter).toBe(' / ')
    expect(MORSE_GAPS.word).toBe('  ')
  })
})

describe('Base58', () => {
  it('字母表剔除了易混的 0 O I l', () => {
    expect(BASE58_ALPHABET).not.toMatch(/[0OIl]/)
    expect(BASE58_ALPHABET).toHaveLength(58)
  })

  it('文本往返', () => {
    for (const text of ['', 'a', 'hello world', 'Hello, World!', '中文字符测试']) {
      expect(new TextDecoder().decode(base58Decode(base58Encode(text)))).toBe(text)
    }
  })

  it('前导零字节被保留', () => {
    // Base58 里前导 0 编码成 '1'，若不单独处理会被吃掉
    const bytes = new Uint8Array([0, 0, 1, 2, 255])
    expect(Array.from(base58Decode(base58Encode(bytes)))).toEqual([0, 0, 1, 2, 255])
  })

  it('长字符串往返', () => {
    const text = 'a'.repeat(200)
    expect(new TextDecoder().decode(base58Decode(base58Encode(text)))).toBe(text)
  })

  it('非法字符抛错', () => {
    expect(() => base58Decode('abc0OIl')).toThrow()
  })

  it('空输入返回空', () => {
    expect(base58Encode('')).toBe('')
    expect(base58Decode('')).toEqual(new Uint8Array(0))
  })
})
