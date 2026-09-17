import { describe, it, expect } from 'vitest'
import { base32Decode, generateHotp, generateTotp, parseOtpauthUri } from '@/common/utils/totp'

// RFC 6238 附录 B 的种子：ASCII "12345678901234567890"
const SEED_B32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
const SEED_ASCII = '12345678901234567890'

describe('base32Decode', () => {
  it('解码出原始 ASCII 字节', () => {
    const bytes = base32Decode(SEED_B32)
    expect(new TextDecoder().decode(bytes)).toBe(SEED_ASCII)
    expect(bytes).toHaveLength(20)
  })

  it('容忍空格 / 连字符 / 小写 / padding', () => {
    const spaced = 'gezd gnbv-gy3t qojq gezdgnbvgy3tqojq===='
    expect(Array.from(base32Decode(spaced))).toEqual(Array.from(base32Decode(SEED_B32)))
  })

  it('空密钥与非法字符抛出中文错误', () => {
    expect(() => base32Decode('')).toThrow('密钥为空')
    expect(() => base32Decode('   ')).toThrow('密钥为空')
    expect(() => base32Decode('ABC1DEF')).toThrow(/非法字符/)
  })
})

describe('generateHotp（RFC 4226 测试向量）', () => {
  it('计数器 0-9 的前十个结果', async () => {
    const expected = [
      '755224',
      '287082',
      '359152',
      '969429',
      '338314',
      '254676',
      '287922',
      '162583',
      '399871',
      '520489',
    ]
    for (let counter = 0; counter < expected.length; counter++) {
      expect(await generateHotp(SEED_B32, counter)).toBe(expected[counter])
    }
  })

  it('8 位码与 SHA-256 / SHA-512（RFC 6238 附录 B）', async () => {
    // T=59s → counter 1
    expect(await generateHotp(SEED_B32, 1, { digits: 8 })).toBe('94287082')

    // SHA-256 的种子是 32 字节 "1234567890...12"，SHA-512 是 64 字节
    const encoder = new TextEncoder()
    const seed256 = encoder.encode('12345678901234567890123456789012')
    expect(await generateHotp(seed256, 1, { digits: 8, algorithm: 'SHA256' })).toBe('46119246')

    const seed512 = encoder.encode(
      '1234567890123456789012345678901234567890123456789012345678901234'
    )
    expect(await generateHotp(seed512, 1, { digits: 8, algorithm: 'SHA512' })).toBe('90693936')
  })
})

describe('generateTotp（RFC 6238 时间点向量，SHA-1 / 8 位）', () => {
  const vectors = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ]

  it.each(vectors)('T=%i 秒 → %s', async (seconds, expected) => {
    const result = await generateTotp(SEED_B32, { timestamp: seconds * 1000, digits: 8 })
    expect(result.code).toBe(expected)
  })

  it('6 位码取后六位，并给出剩余秒数', async () => {
    const result = await generateTotp(SEED_B32, { timestamp: 59000, period: 30 })
    expect(result.code).toBe('287082')
    expect(result.period).toBe(30)
    // 59s 落在第 2 个窗口（30-59s），窗口还剩 1 秒
    expect(result.remaining).toBe(1)
    expect(result.progress).toBeCloseTo(1 / 30, 6)
  })

  it('窗口边界：整点时刻剩余为整周期', async () => {
    const result = await generateTotp(SEED_B32, { timestamp: 60000 })
    expect(result.remaining).toBe(30)
  })
})

describe('parseOtpauthUri', () => {
  it('解析标准 otpauth://totp 链接（含 issuer / digits / period）', () => {
    const uri =
      'otpauth://totp/ACME%20Co:john@example.com?secret=' +
      SEED_B32 +
      '&issuer=ACME%20Co&digits=8&period=60&algorithm=SHA256'
    expect(parseOtpauthUri(uri)).toEqual({
      secret: SEED_B32,
      issuer: 'ACME Co',
      label: 'ACME Co:john@example.com',
      digits: 8,
      period: 60,
      algorithm: 'SHA256',
    })
  })

  it('缺少 issuer 参数时从标签冒号前推断', () => {
    const result = parseOtpauthUri(`otpauth://totp/GitHub:me?secret=${SEED_B32}`)
    expect(result.issuer).toBe('GitHub')
    expect(result.digits).toBe(6)
    expect(result.period).toBe(30)
    expect(result.algorithm).toBe('SHA1')
  })

  it('非 otpauth 链接 / 缺 secret 返回 null', () => {
    expect(parseOtpauthUri('https://example.com')).toBeNull()
    expect(parseOtpauthUri('otpauth://totp/foo')).toBeNull()
    expect(parseOtpauthUri('')).toBeNull()
    expect(parseOtpauthUri(null)).toBeNull()
  })

  it('digits / period 越界时收敛到合法范围', () => {
    const result = parseOtpauthUri(`otpauth://totp/x?secret=${SEED_B32}&digits=99&period=0`)
    expect(result.digits).toBe(10)
    expect(result.period).toBe(1)
  })
})
