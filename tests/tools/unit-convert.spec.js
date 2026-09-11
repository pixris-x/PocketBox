import { describe, expect, it } from 'vitest'
import { UNIT_CATEGORIES, convertUnit } from '@/views/tools/unit-convert/scripts/units'

const category = (id) => UNIT_CATEGORIES.find((item) => item.id === id)
const convert = (categoryId, value, from, to) => convertUnit(value, category(categoryId), from, to)

describe('单位表结构', () => {
  it('包含 6 个分类', () => {
    expect(UNIT_CATEGORIES).toHaveLength(6)
    expect(UNIT_CATEGORIES.map((item) => item.id)).toEqual([
      'length',
      'mass',
      'area',
      'volume',
      'data',
      'temperature',
    ])
  })

  it('每个分类都有说明、默认单位，且单位 id 不重复', () => {
    for (const item of UNIT_CATEGORIES) {
      expect(item.note, `${item.id} 缺少说明`).toBeTruthy()
      expect(
        item.units.some((unit) => unit.id === item.defaultUnit),
        `${item.id} 的默认单位 ${item.defaultUnit} 不在单位表中`
      ).toBe(true)
      const ids = item.units.map((unit) => unit.id)
      expect(new Set(ids).size, `${item.id} 存在重复单位 id`).toBe(ids.length)
    }
  })

  it('每个单位都实现了 toBase 与 fromBase', () => {
    for (const item of UNIT_CATEGORIES) {
      for (const unit of item.units) {
        expect(typeof unit.toBase, `${item.id}/${unit.id}`).toBe('function')
        expect(typeof unit.fromBase, `${item.id}/${unit.id}`).toBe('function')
      }
    }
  })
})

describe('长度换算', () => {
  it('公制进位', () => {
    expect(convert('length', 1, 'm', 'cm')).toBe(100)
    expect(convert('length', 1, 'm', 'mm')).toBe(1000)
    expect(convert('length', 1, 'km', 'm')).toBe(1000)
  })

  it('换算到自身不变', () => {
    expect(convert('length', 1, 'm', 'm')).toBe(1)
    expect(convert('length', 123.45, 'm', 'm')).toBe(123.45)
  })

  it('英制按国际标准定义', () => {
    expect(convert('length', 1, 'in', 'cm')).toBeCloseTo(2.54, 10)
    expect(convert('length', 1, 'ft', 'in')).toBeCloseTo(12, 10)
    expect(convert('length', 1, 'yd', 'ft')).toBeCloseTo(3, 10)
    expect(convert('length', 1, 'mi', 'm')).toBe(1609.344)
    expect(convert('length', 1, 'nmi', 'm')).toBe(1852)
  })
})

describe('重量换算', () => {
  it('公制与市制', () => {
    expect(convert('mass', 1, 'kg', 'g')).toBe(1000)
    expect(convert('mass', 1, 't', 'kg')).toBe(1000)
    expect(convert('mass', 1, 'kg', 'jin')).toBe(2)
  })

  it('英制盎司与磅', () => {
    expect(convert('mass', 1, 'lb', 'oz')).toBeCloseTo(16, 9)
    expect(convert('mass', 1, 'lb', 'g')).toBeCloseTo(453.59237, 5)
  })
})

describe('面积换算', () => {
  it('公顷与平方千米', () => {
    expect(convert('area', 1, 'ha', 'm2')).toBe(10000)
    expect(convert('area', 1, 'km2', 'ha')).toBe(100)
  })

  it('市制亩按 2000/3 平方米', () => {
    expect(convert('area', 1, 'mu', 'm2')).toBeCloseTo(2000 / 3, 9)
    expect(convert('area', 15, 'mu', 'ha')).toBeCloseTo(1, 9)
  })

  it('英亩', () => {
    expect(convert('area', 1, 'ac', 'm2')).toBe(4046.8564224)
  })
})

describe('体积换算', () => {
  it('公制与立方米', () => {
    expect(convert('volume', 1, 'l', 'ml')).toBe(1000)
    expect(convert('volume', 1, 'm3', 'l')).toBe(1000)
  })

  it('美制与英制加仑分别取值', () => {
    expect(convert('volume', 1, 'galus', 'l')).toBeCloseTo(3.785411784, 9)
    expect(convert('volume', 1, 'galuk', 'l')).toBeCloseTo(4.54609, 9)
    const us = convert('volume', 1, 'galus', 'l')
    const uk = convert('volume', 1, 'galuk', 'l')
    expect(uk).toBeGreaterThan(us)
  })

  it('液量盎司与品脱', () => {
    expect(convert('volume', 1, 'floz', 'ml')).toBeCloseTo(29.5735295625, 6)
    expect(convert('volume', 1, 'pt', 'ml')).toBeCloseTo(473.176473, 6)
  })
})

describe('数据存储换算', () => {
  it('十进制档位按 1000 进制', () => {
    expect(convert('data', 1, 'kb', 'b')).toBe(1000)
    expect(convert('data', 1, 'mb', 'b')).toBe(1000000)
    expect(convert('data', 1, 'gb', 'kb')).toBe(1000000)
  })

  it('二进制档位按 1024 进制', () => {
    expect(convert('data', 1, 'kib', 'b')).toBe(1024)
    expect(convert('data', 1, 'mib', 'b')).toBe(1048576)
    expect(convert('data', 1, 'gib', 'mib')).toBe(1024)
    expect(convert('data', 1, 'tib', 'b')).toBe(1099511627776)
  })

  it('两套进制不可混为一谈', () => {
    expect(convert('data', 1, 'mb', 'mib')).not.toBe(1)
    expect(convert('data', 1, 'mb', 'mib')).toBeCloseTo(0.95367431640625, 12)
  })
})

describe('温度换算（线性偏移，不是倍率）', () => {
  it('摄氏与华氏', () => {
    expect(convert('temperature', 100, 'c', 'f')).toBe(212)
    expect(convert('temperature', 0, 'c', 'f')).toBe(32)
    expect(convert('temperature', 37, 'c', 'f')).toBeCloseTo(98.6, 9)
  })

  it('−40 是摄氏与华氏的交点', () => {
    expect(convert('temperature', -40, 'c', 'f')).toBe(-40)
    expect(convert('temperature', -40, 'f', 'c')).toBe(-40)
  })

  it('开尔文', () => {
    expect(convert('temperature', 0, 'c', 'k')).toBeCloseTo(273.15, 9)
    expect(convert('temperature', 0, 'k', 'c')).toBeCloseTo(-273.15, 9)
    expect(convert('temperature', 273.15, 'k', 'f')).toBeCloseTo(32, 9)
  })

  it('来回换算能回到原值', () => {
    const roundTrip = convert('temperature', convert('temperature', 25, 'c', 'f'), 'f', 'c')
    expect(roundTrip).toBeCloseTo(25, 9)
  })
})

describe('非法输入', () => {
  it('非数值返回 null', () => {
    expect(convert('length', NaN, 'm', 'cm')).toBe(null)
    expect(convert('length', null, 'm', 'cm')).toBe(null)
    expect(convert('length', undefined, 'm', 'cm')).toBe(null)
  })

  it('未知单位返回 null', () => {
    expect(convert('length', 1, 'nope', 'cm')).toBe(null)
    expect(convert('length', 1, 'm', 'nope')).toBe(null)
  })

  it('分类为空返回 null', () => {
    expect(convertUnit(1, null, 'm', 'cm')).toBe(null)
  })

  it('零与负数正常参与换算', () => {
    expect(convert('length', 0, 'm', 'cm')).toBe(0)
    expect(convert('temperature', -100, 'c', 'f')).toBe(-148)
  })
})
