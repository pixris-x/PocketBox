import { describe, expect, it } from 'vitest'
import { hashBuffer, hashFile, hashText } from '@/common/utils/md5'

describe('hashText（RFC 1321 标准测试向量）', () => {
  it('空串', () => {
    expect(hashText('')).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })

  it('单个字符', () => {
    expect(hashText('a')).toBe('0cc175b9c0f1b6a831c399e269772661')
  })

  it('经典向量 abc', () => {
    expect(hashText('abc')).toBe('900150983cd24fb0d6963f7d28e17f72')
  })

  it('含空格的向量', () => {
    expect(hashText('message digest')).toBe('f96b697d7cb7938d525a2f31aaf161d0')
  })

  it('26 个小写字母', () => {
    expect(hashText('abcdefghijklmnopqrstuvwxyz')).toBe('c3fcd3d76192e4007dfb496cca67e13b')
  })

  it('始终返回 32 位小写十六进制', () => {
    for (const text of ['', 'a', '中文', '🎉', 'a'.repeat(1000)]) {
      expect(hashText(text)).toMatch(/^[0-9a-f]{32}$/)
    }
  })

  it('中文按 UTF-8 编码，结果稳定且与同字节的 ASCII 不同', () => {
    const first = hashText('中文')
    expect(hashText('中文')).toBe(first)
    expect(first).not.toBe(hashText('abc'))
  })
})

describe('hashBuffer', () => {
  it('与同内容文本的摘要一致', () => {
    const buffer = new TextEncoder().encode('abc').buffer
    expect(hashBuffer(buffer)).toBe('900150983cd24fb0d6963f7d28e17f72')
  })

  it('空 buffer', () => {
    expect(hashBuffer(new ArrayBuffer(0))).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })
})

describe('hashFile', () => {
  it('与同内容文本的摘要一致', async () => {
    const file = new Blob(['abc'])
    await expect(hashFile(file)).resolves.toBe('900150983cd24fb0d6963f7d28e17f72')
  })

  it('中文内容文件', async () => {
    const file = new Blob(['中文'])
    await expect(hashFile(file)).resolves.toBe(hashText('中文'))
  })
})
