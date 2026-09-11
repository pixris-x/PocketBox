import { describe, expect, it } from 'vitest'
import {
  dateToIsoString,
  dateToLocalString,
  dateToTs,
  dateToUtcString,
  isValidTimestamp,
  nowTs,
  tsToDate,
} from '@/common/utils/timestamp'

// 用「本地构造 + 本地格式化」的方式断言，避免依赖运行机器的时区
const LOCAL = new Date(2024, 0, 5, 3, 4, 5)
const UTC = new Date(Date.UTC(2024, 0, 5, 3, 4, 5))
const INVALID = new Date('not a date')

describe('tsToDate', () => {
  it('默认按秒解释', () => {
    expect(tsToDate(0).getTime()).toBe(0)
    expect(tsToDate(1000).getTime()).toBe(1000000)
  })

  it('ms 选项按毫秒解释', () => {
    expect(tsToDate(1000, { ms: true }).getTime()).toBe(1000)
  })
})

describe('日期格式化', () => {
  it('本地时间格式为 YYYY-MM-DD HH:mm:ss 且补零', () => {
    expect(dateToLocalString(LOCAL)).toBe('2024-01-05 03:04:05')
  })

  it('UTC 时间格式为 YYYY-MM-DD HH:mm:ss 且补零', () => {
    expect(dateToUtcString(UTC)).toBe('2024-01-05 03:04:05')
  })

  it('ISO 字符串', () => {
    expect(dateToIsoString(UTC)).toBe('2024-01-05T03:04:05.000Z')
  })

  it('无效日期统一返回「无效日期」', () => {
    expect(dateToLocalString(INVALID)).toBe('无效日期')
    expect(dateToUtcString(INVALID)).toBe('无效日期')
    expect(dateToIsoString(INVALID)).toBe('无效日期')
  })
})

describe('dateToTs', () => {
  it('Date 对象转秒时间戳（向下取整）', () => {
    expect(dateToTs(UTC)).toBe(Math.floor(UTC.getTime() / 1000))
  })

  it('ms 选项返回毫秒', () => {
    expect(dateToTs(UTC, { ms: true })).toBe(UTC.getTime())
  })

  it('日期字符串可解析', () => {
    expect(dateToTs('2024-01-05T03:04:05.000Z')).toBe(Math.floor(UTC.getTime() / 1000))
  })

  it('无效输入返回 null', () => {
    expect(dateToTs('not a date')).toBe(null)
    expect(dateToTs('')).toBe(null)
  })

  it('与 tsToDate 互为逆运算', () => {
    const ts = 1704423845
    expect(dateToTs(tsToDate(ts))).toBe(ts)
  })
})

describe('nowTs', () => {
  it('默认返回秒', () => {
    expect(Math.abs(nowTs() - Date.now() / 1000)).toBeLessThan(2)
  })

  it('ms 选项返回毫秒', () => {
    expect(Math.abs(nowTs({ ms: true }) - Date.now())).toBeLessThan(50)
  })
})

describe('isValidTimestamp', () => {
  it('零点与当前量级的秒时间戳合法', () => {
    expect(isValidTimestamp(0)).toBe(true)
    expect(isValidTimestamp(1700000000)).toBe(true)
  })

  it('毫秒时间戳同样合法', () => {
    expect(isValidTimestamp(1700000000000)).toBe(true)
  })

  it('2100-01-01 是边界，超出即非法', () => {
    expect(isValidTimestamp(4102444800)).toBe(true)
    expect(isValidTimestamp(4102444801)).toBe(false)
    expect(isValidTimestamp(4102444800000)).toBe(true)
  })

  it('负数与非有限值非法', () => {
    expect(isValidTimestamp(-1)).toBe(false)
    expect(isValidTimestamp(NaN)).toBe(false)
    expect(isValidTimestamp(Infinity)).toBe(false)
  })

  // 说明：秒 / 毫秒靠 `ts > 1e11` 这个阈值区分，因此 1973-03-03 之前的
  // 毫秒时间戳会被误判为秒。属于该启发式的已知边界，不在测试中固化。
})
