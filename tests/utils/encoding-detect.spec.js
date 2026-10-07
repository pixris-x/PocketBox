import { describe, expect, it } from 'vitest'
import {
  ENCODINGS,
  decodeWith,
  detectEncoding,
  tryAllEncodings,
} from '@/common/utils/encoding-detect'

/** 「中文测试」的 GBK 字节（权威编码表，不用运行时生成） */
const GBK_BYTES = new Uint8Array([0xd6, 0xd0, 0xce, 0xc4, 0xb2, 0xe2, 0xca, 0xd4])
const UTF8_BYTES = new Uint8Array([
  0xe4, 0xb8, 0xad, 0xe6, 0x96, 0x87, 0xe6, 0xb5, 0x8b, 0xe8, 0xaf, 0x95,
])

describe('detectEncoding 编码探测', () => {
  it('UTF-8 中文被正确识别', () => {
    const result = detectEncoding(UTF8_BYTES)
    expect(result.encoding).toBe('utf-8')
    expect(result.confidence).toBe('high')
  })

  it('BOM 优先级最高', () => {
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, 0x41, 0x42])
    const result = detectEncoding(withBom)
    expect(result.encoding).toBe('utf-8')
    expect(result.hasBOM).toBe(true)
    expect(result.bomName).toBe('UTF-8 BOM')
  })

  it('UTF-16 无 BOM 按 null 字节位置定字节序', () => {
    // 「A」= 41 00 是小端，00 41 是大端 —— 判断写反过一次
    expect(detectEncoding(new Uint8Array([0x41, 0x00, 0x42, 0x00])).encoding).toBe('utf-16le')
    expect(detectEncoding(new Uint8Array([0x00, 0x41, 0x00, 0x42])).encoding).toBe('utf-16be')
  })

  it('纯 ASCII 判为 UTF-8 且置信度高', () => {
    const result = detectEncoding(new Uint8Array([65, 66, 67]))
    expect(result.encoding).toBe('utf-8')
    expect(result.confidence).toBe('high')
  })

  it('GBK 字节回落为 GBK 但置信度标 low', () => {
    // GBK 与 Big5 字节区间高度重叠，无法确定，只能给 low
    const result = detectEncoding(GBK_BYTES)
    expect(result.encoding).toBe('gbk')
    expect(result.confidence).toBe('low')
  })

  it('非法 UTF-8 序列不会误判', () => {
    // 0xC0 0x80 是过长编码，0xED 0xA0 是代理区
    expect(detectEncoding(new Uint8Array([0xc0, 0x80])).encoding).not.toBe('utf-8')
    expect(detectEncoding(new Uint8Array([0xed, 0xa0, 0x80])).encoding).not.toBe('utf-8')
  })

  it('空输入返回低置信度默认值', () => {
    const result = detectEncoding(new Uint8Array(0))
    expect(result.encoding).toBe('utf-8')
    expect(result.confidence).toBe('low')
    expect(detectEncoding('').confidence).toBe('low')
  })
})

describe('decodeWith 按编码解码', () => {
  it('GBK 字节用 GBK 解码得到正确中文', () => {
    const result = decodeWith(GBK_BYTES, 'gbk')
    expect(result.ok).toBe(true)
    expect(result.text).toBe('中文测试')
    expect(result.hasReplacement).toBe(false)
  })

  it('GBK 字节误当 UTF-8 会产生替换符', () => {
    const result = decodeWith(GBK_BYTES, 'utf-8')
    expect(result.hasReplacement).toBe(true)
  })

  it('空输入报错', () => {
    expect(decodeWith('', 'utf-8').ok).toBe(false)
  })
})

describe('tryAllEncodings 横向对比', () => {
  it('结果按可信度排序，GBK 字节应把 GBK 排在首位', () => {
    const results = tryAllEncodings(GBK_BYTES)
    expect(results[0].encoding).toBe('gbk')
    expect(results[0].text).toBe('中文测试')
  })

  it('每项都带可打印性评分与替换符比例', () => {
    for (const item of tryAllEncodings(GBK_BYTES)) {
      expect(item.printableRate).toBeGreaterThanOrEqual(0)
      expect(item.printableRate).toBeLessThanOrEqual(1)
      expect(item.replacementRate).toBeGreaterThanOrEqual(0)
      expect(item.replacementRate).toBeLessThanOrEqual(1)
    }
  })

  it('UTF-8 字节应把 UTF-8 排在首位', () => {
    expect(tryAllEncodings(UTF8_BYTES)[0].encoding).toBe('utf-8')
  })

  it('覆盖全部候选编码（顺序按可信度，不等于声明顺序）', () => {
    const got = tryAllEncodings(GBK_BYTES).map((r) => r.encoding)
    expect([...got].sort()).toEqual(ENCODINGS.map((item) => item.value).sort())
  })

  it('空输入返回空数组', () => {
    expect(tryAllEncodings('')).toEqual([])
  })
})
