import { describe, expect, it } from 'vitest'
import {
  SHA_ALGORITHMS,
  isWebCryptoAvailable,
  shaBuffer,
  shaFile,
  shaText,
} from '@/common/utils/sha'

// FIPS 180 标准向量（已用 Node 的 Web Crypto 实测核对）
const VECTORS = {
  'SHA-1': {
    '': 'da39a3ee5e6b4b0d3255bfef95601890afd80709',
    abc: 'a9993e364706816aba3e25717850c26c9cd0d89d',
    中文: '7be2d2d20c106eee0836c9bc2b939890a78e8fb3',
  },
  'SHA-256': {
    '': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    abc: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    中文: '72726d8818f693066ceb69afa364218b692e62ea92b385782363780f47529c21',
  },
  'SHA-384': {
    '': '38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b',
    abc: 'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7',
    中文: '93422ceb8291a69b22f02dc1114c39a287493ad525dcebc77e4019a44eaee2633a85d0f29cd298ee6799048c33a4be0c',
  },
  'SHA-512': {
    '': 'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e',
    abc: 'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
    中文: '8b88efc2ebbcbdad5ac2d65af05bec57bda25e71fd5fb25bbd892057a2755fbd05d8d8491cb2946febd5b0f124ffdfbaecf7e34946353c4f1b5ab29545895468',
  },
}

// 摘要长度（位 → 十六进制字符数）
const LENGTHS = { 'SHA-1': 40, 'SHA-256': 64, 'SHA-384': 96, 'SHA-512': 128 }

describe('SHA_ALGORITHMS', () => {
  it('声明了 4 种算法，默认项为 SHA-256', () => {
    expect(SHA_ALGORITHMS).toHaveLength(4)
    expect(SHA_ALGORITHMS[0].id).toBe('SHA-256')
  })

  it('每项都有 id / label / note', () => {
    for (const item of SHA_ALGORITHMS) {
      expect(item.id).toBeTruthy()
      expect(item.label).toBeTruthy()
      expect(item.note).toBeTruthy()
    }
  })

  it('标注了 SHA-1 的安全性风险', () => {
    const sha1 = SHA_ALGORITHMS.find((item) => item.id === 'SHA-1')
    expect(sha1.note).toContain('碰撞')
  })
})

describe('shaText（FIPS 180 标准向量）', () => {
  for (const [algorithm, vectors] of Object.entries(VECTORS)) {
    for (const [input, expected] of Object.entries(vectors)) {
      const label = input === '' ? '空串' : input
      it(`${algorithm} · ${label}`, async () => {
        await expect(shaText(input, algorithm)).resolves.toBe(expected)
      })
    }
  }

  it('默认使用 SHA-256', async () => {
    await expect(shaText('abc')).resolves.toBe(VECTORS['SHA-256'].abc)
  })

  it('null 与 undefined 按空串处理', async () => {
    await expect(shaText(null)).resolves.toBe(VECTORS['SHA-256'][''])
    await expect(shaText(undefined)).resolves.toBe(VECTORS['SHA-256'][''])
  })

  it('输出为小写十六进制，长度与算法匹配', async () => {
    for (const [algorithm, length] of Object.entries(LENGTHS)) {
      const digest = await shaText('hello', algorithm)
      expect(digest).toMatch(/^[0-9a-f]+$/)
      expect(digest).toHaveLength(length)
    }
  })

  it('中文按 UTF-8 编码，结果稳定', async () => {
    const first = await shaText('中文')
    await expect(shaText('中文')).resolves.toBe(first)
    expect(first).not.toBe(await shaText('abc'))
  })

  it('不支持的算法给出明确错误', async () => {
    await expect(shaText('abc', 'MD5')).rejects.toThrow('不支持的算法')
    await expect(shaText('abc', 'SHA-512/256')).rejects.toThrow('不支持的算法')
  })
})

describe('shaBuffer', () => {
  it('与同内容文本的摘要一致', async () => {
    const buffer = new TextEncoder().encode('abc').buffer
    await expect(shaBuffer(buffer)).resolves.toBe(VECTORS['SHA-256'].abc)
  })

  it('空 buffer', async () => {
    await expect(shaBuffer(new ArrayBuffer(0))).resolves.toBe(VECTORS['SHA-256'][''])
  })

  it('可指定算法', async () => {
    const buffer = new TextEncoder().encode('abc').buffer
    await expect(shaBuffer(buffer, 'SHA-512')).resolves.toBe(VECTORS['SHA-512'].abc)
  })
})

describe('shaFile', () => {
  it('与同内容文本的摘要一致', async () => {
    await expect(shaFile(new Blob(['abc']))).resolves.toBe(VECTORS['SHA-256'].abc)
  })

  it('中文内容文件', async () => {
    await expect(shaFile(new Blob(['中文']))).resolves.toBe(VECTORS['SHA-256']['中文'])
  })

  it('可指定算法', async () => {
    await expect(shaFile(new Blob(['abc']), 'SHA-1')).resolves.toBe(VECTORS['SHA-1'].abc)
  })

  it('空文件', async () => {
    await expect(shaFile(new Blob([]))).resolves.toBe(VECTORS['SHA-256'][''])
  })
})

describe('运行环境', () => {
  it('Node 22 下 Web Crypto 可用', () => {
    expect(isWebCryptoAvailable()).toBe(true)
  })

  it('不可用时抛出的错误提示指向安全上下文', async () => {
    const original = globalThis.crypto
    try {
      Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true })
      expect(isWebCryptoAvailable()).toBe(false)
      await expect(shaText('abc')).rejects.toThrow('HTTPS 或 localhost')
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true })
    }
  })
})
