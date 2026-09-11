import { describe, expect, it } from 'vitest'
import { formatBytes, formatNumber, formatSignificant, savingPercent } from '@/common/utils/format'

describe('formatBytes', () => {
  it('零与负数', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(-1)).toBe('-')
  })

  it('非有限值返回占位符', () => {
    expect(formatBytes(NaN)).toBe('-')
    expect(formatBytes(Infinity)).toBe('-')
  })

  it('按 1024 进制进位', () => {
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
    expect(formatBytes(1024 ** 3)).toBe('1.0 GB')
  })

  it('字节档不带小数', () => {
    expect(formatBytes(100)).toBe('100 B')
  })

  it('超过 100 的档位不保留小数', () => {
    expect(formatBytes(1024 * 200)).toBe('200 KB')
  })
})

describe('formatNumber（千分位）', () => {
  it('插入千分位分隔符', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  it('默认最多保留 3 位小数', () => {
    expect(formatNumber(1234.5678)).toBe('1,234.568')
  })

  it('非有限值返回占位符', () => {
    expect(formatNumber(NaN)).toBe('-')
  })
})

describe('formatSignificant（有效数字）', () => {
  it('消除浮点尾数', () => {
    expect(formatSignificant(0.30000000000000004)).toBe('0.3')
    expect(formatSignificant(0.1 + 0.2)).toBe('0.3')
  })

  it('零与非有限值', () => {
    expect(formatSignificant(0)).toBe('0')
    expect(formatSignificant(NaN)).toBe('-')
    expect(formatSignificant(Infinity)).toBe('-')
  })

  it('大整数不被截断（回归：曾用 10 位有效数字导致失真）', () => {
    expect(formatSignificant(1099511627776)).toBe('1099511627776')
    expect(formatSignificant(9007199254740991)).toBe('9007199254740991')
  })

  it('极小值走科学计数法', () => {
    expect(formatSignificant(9.094947017729282e-13)).toBe('9.09494701772928e-13')
  })

  it('普通小数与整数', () => {
    expect(formatSignificant(0.001)).toBe('0.001')
    expect(formatSignificant(100)).toBe('100')
    expect(formatSignificant(3.2808398950131235)).toBe('3.28083989501312')
  })

  it('可自定义有效数字位数', () => {
    expect(formatSignificant(1 / 3, 4)).toBe('0.3333')
    expect(formatSignificant(1 / 3, 2)).toBe('0.33')
  })
})

describe('savingPercent', () => {
  it('计算节省比例', () => {
    expect(savingPercent(100, 60)).toBe(40)
    expect(savingPercent(1000, 250)).toBe(75)
  })

  it('原始值非正时返回 0', () => {
    expect(savingPercent(0, 10)).toBe(0)
    expect(savingPercent(-5, 1)).toBe(0)
  })

  it('结果被限制在 0~100', () => {
    expect(savingPercent(100, 120)).toBe(0)
    expect(savingPercent(100, -50)).toBe(100)
  })
})
