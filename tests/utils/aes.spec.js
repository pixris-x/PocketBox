import { describe, expect, it } from 'vitest'
import {
  PBKDF2_ITERATIONS,
  decryptText,
  encryptText,
  isWebCryptoAvailable,
} from '@/common/utils/aes'

const fromBase64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

describe('isWebCryptoAvailable', () => {
  it('Node 22 环境下应可用（globalThis.crypto.subtle）', () => {
    expect(isWebCryptoAvailable()).toBe(true)
  })
})

describe('encryptText / decryptText 往返', () => {
  it.each([
    ['英文', 'hello world'],
    ['中文', '中文文本加解密'],
    ['emoji 与混合', 'emoji 🎉 混合中文 abc'],
    ['空串', ''],
    ['换行与特殊字符', 'line1\nline2\t"引号" <tag> &amp;'],
  ])('%s', async (_name, text) => {
    const cipher = await encryptText(text, '口令123')
    expect(typeof cipher).toBe('string')
    await expect(decryptText(cipher, '口令123')).resolves.toBe(text)
  })

  it('同明文同口令每次密文不同（盐与 IV 随机）', async () => {
    const a = await encryptText('same text', 'pw')
    const b = await encryptText('same text', 'pw')
    expect(a).not.toBe(b)
  })

  it('密文头部为版本字节 0x01 + 16 字节盐 + 12 字节 IV', async () => {
    // 空明文时密文最短 = 16 字节 GCM 认证标签
    const bytes = fromBase64(await encryptText('', 'pw'))
    expect(bytes[0]).toBe(0x01)
    expect(bytes.length).toBe(1 + 16 + 12 + 16)
    // 单字节明文则再多 1 字节
    const one = fromBase64(await encryptText('x', 'pw'))
    expect(one.length).toBe(1 + 16 + 12 + 1 + 16)
  })

  it('PBKDF2 迭代次数为公开常量（OWASP 推荐值）', () => {
    expect(PBKDF2_ITERATIONS).toBe(310000)
  })
})

describe('失败路径（错误信息必须可读）', () => {
  const cipherPromise = encryptText('机密数据', '正确口令')

  it('口令错误 → 明确提示', async () => {
    const cipher = await cipherPromise
    await expect(decryptText(cipher, '错误口令')).rejects.toThrow(
      '口令不正确，或密文已损坏 / 被篡改'
    )
  })

  it('密文被篡改 → 认证失败', async () => {
    const bytes = fromBase64(await cipherPromise)
    bytes[bytes.length - 1] ^= 0x01 // 翻转认证标签最后一个比特
    const tampered = btoa(String.fromCharCode(...bytes))
    await expect(decryptText(tampered, '正确口令')).rejects.toThrow('口令不正确')
  })

  it('不是有效 Base64 → 明确提示', async () => {
    await expect(decryptText('!!!不是base64!!!', 'pw')).rejects.toThrow('不是有效的 Base64')
  })

  it('是 Base64 但格式不对（外部数据）→ 明确提示', async () => {
    const foreign = btoa('hello world this is not our format at all')
    await expect(decryptText(foreign, 'pw')).rejects.toThrow('密文格式不正确')
  })

  it('被截断的密文 → 格式错误而非崩溃', async () => {
    const bytes = fromBase64(await cipherPromise)
    const truncated = btoa(String.fromCharCode(...bytes.slice(0, 20)))
    await expect(decryptText(truncated, 'pw')).rejects.toThrow('密文格式不正确')
  })

  it('空口令在加密与解密侧都被拒绝', async () => {
    await expect(encryptText('x', '')).rejects.toThrow('口令不能为空')
    await expect(decryptText('aGVsbG8=', '')).rejects.toThrow('口令不能为空')
  })
})
