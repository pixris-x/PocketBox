import { describe, expect, it } from 'vitest'
import { ALGORITHM_NOTES, JWT_CLAIMS, decodeJwt, tokenTimeStatus } from '@/common/utils/jwt'

const HEADER = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
const PAYLOAD =
  'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW8oOS4iSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjo0MTAyNDQ0ODAwfQ'
const SIGNATURE = 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
const TOKEN = `${HEADER}.${PAYLOAD}.${SIGNATURE}`

describe('decodeJwt', () => {
  it('解出 header', () => {
    expect(decodeJwt(TOKEN).header).toEqual({ alg: 'HS256', typ: 'JWT' })
  })

  it('解出 payload，含中文与标准声明', () => {
    const { payload } = decodeJwt(TOKEN)
    expect(payload.sub).toBe('1234567890')
    expect(payload.name).toBe('张三')
    expect(payload.role).toBe('admin')
    expect(payload.iat).toBe(1516239022)
    expect(payload.exp).toBe(4102444800)
  })

  it('签名段原样返回（不做解码）', () => {
    expect(decodeJwt(TOKEN).signature).toBe(SIGNATURE)
  })

  it('容忍 Bearer 前缀与首尾空白', () => {
    expect(decodeJwt(`Bearer ${TOKEN}`).payload.sub).toBe('1234567890')
    expect(decodeJwt(`  ${TOKEN}  `).payload.sub).toBe('1234567890')
    expect(decodeJwt(`bearer ${TOKEN}`).payload.sub).toBe('1234567890')
  })

  it('两段的未签名令牌也能解', () => {
    const unsigned = decodeJwt(`${HEADER}.${PAYLOAD}`)
    expect(unsigned.signature).toBe('')
    expect(unsigned.payload.sub).toBe('1234567890')
  })

  it('空输入与 null 给出明确提示', () => {
    expect(() => decodeJwt('')).toThrow('请先粘贴')
    expect(() => decodeJwt(null)).toThrow('请先粘贴')
  })

  it('段数不对时报错并说明实际段数', () => {
    expect(() => decodeJwt('abc')).toThrow('至少需要两段')
    expect(() => decodeJwt('a.b.c.d')).toThrow('应为三段')
  })

  it('header 段非法时定位到 header', () => {
    expect(() => decodeJwt('!!!.eyJhIjoxfQ')).toThrow('Header 段不是合法')
  })

  it('payload 段不是 JSON 时定位到 payload', () => {
    expect(() => decodeJwt(`${HEADER}.YWJj`)).toThrow('Payload 段解码后不是合法 JSON')
  })
})

describe('tokenTimeStatus', () => {
  const NOW = 1700000000000 // 固定基准，避免用真实时间导致偶发失败

  it('exp 已过 → expired', () => {
    expect(tokenTimeStatus({ exp: 1600000000 }, NOW)).toBe('expired')
  })

  it('exp 未到 → valid', () => {
    expect(tokenTimeStatus({ exp: 1800000000 }, NOW)).toBe('valid')
  })

  it('nbf 未到 → not-yet', () => {
    expect(tokenTimeStatus({ nbf: 1800000000 }, NOW)).toBe('not-yet')
  })

  it('nbf 已过 → valid', () => {
    expect(tokenTimeStatus({ nbf: 1600000000 }, NOW)).toBe('valid')
  })

  it('没有时间声明 → unknown', () => {
    expect(tokenTimeStatus({ sub: 'x' }, NOW)).toBe('unknown')
    expect(tokenTimeStatus({}, NOW)).toBe('unknown')
    expect(tokenTimeStatus(undefined, NOW)).toBe('unknown')
  })

  it('exp 恰好等于当前时刻算已过期', () => {
    expect(tokenTimeStatus({ exp: NOW / 1000 }, NOW)).toBe('expired')
  })

  it('非数字的时间声明被忽略', () => {
    expect(tokenTimeStatus({ exp: '123' }, NOW)).toBe('unknown')
  })

  it('两者同时存在时 exp 已过优先于 nbf 未到', () => {
    expect(tokenTimeStatus({ nbf: 1800000000, exp: 1600000000 }, NOW)).toBe('expired')
  })

  it('nbf 未到优先于 exp 未到', () => {
    expect(tokenTimeStatus({ nbf: 1800000000, exp: 1900000000 }, NOW)).toBe('not-yet')
  })
})

describe('声明清单与算法表', () => {
  it('包含 7 项标准声明，每项都有 key 与 label', () => {
    expect(JWT_CLAIMS).toHaveLength(7)
    for (const claim of JWT_CLAIMS) {
      expect(claim.key).toBeTruthy()
      expect(claim.label).toBeTruthy()
    }
  })

  it('时间类声明被标记出来', () => {
    const timeKeys = JWT_CLAIMS.filter((claim) => claim.time).map((claim) => claim.key)
    expect(timeKeys.sort()).toEqual(['exp', 'iat', 'nbf'])
  })

  it('算法表收录常见算法并有说明', () => {
    expect(typeof ALGORITHM_NOTES.HS256).toBe('string')
    expect(typeof ALGORITHM_NOTES.RS256).toBe('string')
    expect(ALGORITHM_NOTES.none).toContain('未签名')
  })
})
