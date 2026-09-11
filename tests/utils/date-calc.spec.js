import { describe, expect, it } from 'vitest'
import {
  addToDate,
  diffDates,
  daysInMonth,
  formatDate,
  isLeapYear,
  parseDate,
  todayString,
} from '@/common/utils/date-calc'

const errMsg = (fn) => {
  try {
    fn()
  } catch (e) {
    return e.message
  }
  return null
}

describe('parseDate / formatDate', () => {
  it.each([['2024-01-01'], ['2024-12-31'], ['2000-02-29'], ['1999-12-31']])('往返 %s', (text) => {
    expect(formatDate(parseDate(text))).toBe(text)
  })

  it('接受 Date 对象', () => {
    // 内部转 UTC 00:00
    const d = new Date(Date.UTC(2024, 0, 15))
    expect(formatDate(d)).toBe('2024-01-15')
  })

  it.each([
    ['', '日期不能为空'],
    ['2024/01/01', '必须为 YYYY-MM-DD'],
    ['24-01-01', '必须为 YYYY-MM-DD'],
    ['2024-13-01', '月份必须在 01–12'],
    ['2024-02-30', '超出当月范围'],
    ['2023-02-29', '超出当月范围'],
  ])('非法输入「%s」', (text, expected) => {
    expect(errMsg(() => parseDate(text))).toMatch(expected)
  })
})

describe('isLeapYear / daysInMonth', () => {
  it.each([
    [2000, true],
    [1900, false],
    [2024, true],
    [2023, false],
    [2025, false],
  ])('%d → %s', (year, expected) => {
    expect(isLeapYear(year)).toBe(expected)
  })

  it.each([
    [2024, 2, 29],
    [2023, 2, 28],
    [2024, 4, 30],
    [2024, 1, 31],
    [2000, 2, 29],
  ])('%d-%d → %d 天', (year, month, expected) => {
    expect(daysInMonth(year, month)).toBe(expected)
  })
})

describe('diffDates', () => {
  it('同日差值为 0', () => {
    const r = diffDates('2024-01-15', '2024-01-15')
    expect(r.totalDays).toBe(0)
    expect(r.direction).toBe('same')
    expect(r.breakdown).toBe('0 天')
  })

  it('1 天', () => {
    expect(diffDates('2024-01-01', '2024-01-02').totalDays).toBe(1)
  })

  it('跨月', () => {
    const r = diffDates('2024-01-15', '2024-02-20')
    expect(r.totalDays).toBe(36)
    expect(r.breakdown).toContain('1 个月')
  })

  it('跨年且跨闰年（2024-02-29）', () => {
    const r = diffDates('2023-06-15', '2025-03-10')
    expect(r.years).toBe(1)
    expect(r.months).toBe(8)
    expect(r.totalDays).toBeGreaterThan(0)
  })

  it('方向：反向', () => {
    const r = diffDates('2024-02-01', '2024-01-01')
    expect(r.direction).toBe('backward')
    expect(r.totalDays).toBe(31)
  })

  it('年到年的整年差', () => {
    const r = diffDates('2020-03-01', '2024-03-01')
    expect(r.years).toBe(4)
    expect(r.months).toBe(0)
    expect(r.days).toBe(0)
  })

  it('同月跨日', () => {
    const r = diffDates('2024-03-10', '2024-03-25')
    expect(r.months).toBe(0)
    expect(r.days).toBe(15)
  })

  it('月差补年（如 2024-03-15 → 2023-04-15）', () => {
    const r = diffDates('2024-03-15', '2023-04-15')
    expect(r.years).toBe(0)
    expect(r.months).toBe(11)
  })

  it('breakdown 拼接顺序与可读性', () => {
    const r = diffDates('2020-01-15', '2024-03-20')
    expect(r.breakdown).toMatch(/4 年 2 个月 5 天/)
  })
})

describe('addToDate', () => {
  it('加日：跨月', () => {
    expect(addToDate('2024-01-31', { days: 1 })).toBe('2024-02-01')
  })

  it('减日：跨月', () => {
    expect(addToDate('2024-03-01', { days: -1 })).toBe('2024-02-29')
  })

  it('加月：1月31日 + 1月 → 2月29日（闰年夹紧到月末）', () => {
    expect(addToDate('2024-01-31', { months: 1 })).toBe('2024-02-29')
  })

  it('加月：1月31日 + 1月（非闰年夹紧到 28）', () => {
    expect(addToDate('2023-01-31', { months: 1 })).toBe('2023-02-28')
  })

  it('加年：闰日 + 1年 → 次年 2月 28', () => {
    expect(addToDate('2024-02-29', { years: 1 })).toBe('2025-02-28')
  })

  it('加年再回闰年夹紧恢复', () => {
    expect(addToDate('2024-02-29', { years: 4 })).toBe('2028-02-29')
  })

  it('加周', () => {
    expect(addToDate('2024-01-01', { weeks: 2 })).toBe('2024-01-15')
  })

  it('复合加减：年 + 月 + 日', () => {
    expect(addToDate('2024-01-15', { years: 1, months: 2, days: 3 })).toBe('2025-03-18')
  })

  it('跨年加月（13 个月）', () => {
    expect(addToDate('2024-01-15', { months: 13 })).toBe('2025-02-15')
  })
})

describe('addToDate workdays（跳过周末）', () => {
  it('周五加 1 个工作日 → 周一', () => {
    // 2024-01-05 是周五
    expect(addToDate('2024-01-05', { workdays: 1 })).toBe('2024-01-08')
  })

  it('周一加 5 个工作日 → 下周一', () => {
    // 2024-01-08 周一 + 5 workdays = 2024-01-15
    expect(addToDate('2024-01-08', { workdays: 5 })).toBe('2024-01-15')
  })

  it('周六加 1 个工作日 → 周一（起步即跳过周末）', () => {
    // 2024-01-06 是周六
    expect(addToDate('2024-01-06', { workdays: 1 })).toBe('2024-01-08')
  })

  it('负工作日：周一向后退 1 个工作日 → 上周五', () => {
    expect(addToDate('2024-01-08', { workdays: -1 })).toBe('2024-01-05')
  })

  it('零工作日 → 原日期', () => {
    expect(addToDate('2024-01-15', { workdays: 0 })).toBe('2024-01-15')
  })
})

describe('todayString', () => {
  it('格式 YYYY-MM-DD', () => {
    expect(todayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('等于本地 today', () => {
    const d = new Date()
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    expect(todayString()).toBe(expected)
  })
})
