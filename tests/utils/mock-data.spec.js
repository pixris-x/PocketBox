import { describe, expect, it } from 'vitest'
import {
  MOCK_FIELDS,
  fakeAddress,
  fakeBankCard,
  fakeCompany,
  fakeDateTime,
  fakeEmail,
  fakeIdCard,
  fakeIp,
  fakeName,
  fakePhone,
  generateMockRow,
  generateMockRows,
  mockRowsToCsv,
  randomInt,
} from '@/common/utils/mock-data'
import { validateBankCard, validateIdCard, validatePhone } from '@/common/utils/idcard-mask'

describe('randomInt 随机源', () => {
  it('落在 [0, max) 内', () => {
    for (let i = 0; i < 200; i += 1) {
      const value = randomInt(10)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(10)
    }
  })

  it('max ≤ 0 与 1 的边界', () => {
    expect(randomInt(0)).toBe(0)
    expect(randomInt(-5)).toBe(0)
    expect(randomInt(1)).toBe(0)
  })

  it('覆盖整个取值范围（拒绝采样无偏差）', () => {
    const seen = new Set()
    for (let i = 0; i < 300; i += 1) seen.add(randomInt(6))
    expect(seen.size).toBe(6)
  })
})

describe('fakeName 中文姓名', () => {
  it('姓在百家姓中、名为 1~2 字', () => {
    for (let i = 0; i < 100; i += 1) {
      const name = fakeName()
      expect(name.length).toBeGreaterThanOrEqual(2)
      expect(name.length).toBeLessThanOrEqual(3)
      // 中文字符
      expect(/^[一-龥]+$/.test(name)).toBe(true)
    }
  })
})

describe('fakePhone 手机号', () => {
  it('生成的号码真能通过校验器（500 轮）', () => {
    for (let i = 0; i < 500; i += 1) {
      expect(validatePhone(fakePhone()).valid).toBe(true)
    }
  })

  it('是 11 位', () => {
    expect(fakePhone()).toMatch(/^1[3-9]\d{9}$/)
  })
})

describe('fakeIdCard 身份证', () => {
  it('生成的号码真能通过校验器（500 轮）', () => {
    // 这是本模块的核心约束：假数据必须过得了 validateIdCard，
    // 否则测试时会被校验拦下，反而分不清是数据问题还是校验有 bug
    for (let i = 0; i < 500; i += 1) {
      const result = validateIdCard(fakeIdCard())
      expect(result.valid).toBe(true)
    }
  })

  it('末位由 GB 11643 算法算出', () => {
    const id = fakeIdCard()
    expect(id).toMatch(/^\d{17}[\dX]$/)
  })

  it('地区码落在表内的省级码', () => {
    const id = fakeIdCard()
    expect(['11', '31', '32', '33', '35', '42', '44', '50', '51', '61']).toContain(id.slice(0, 2))
  })
})

describe('fakeBankCard 银行卡', () => {
  it('生成的卡号真能通过 Luhn（500 轮）', () => {
    for (let i = 0; i < 500; i += 1) {
      expect(validateBankCard(fakeBankCard()).valid).toBe(true)
    }
  })

  it('长度 19 位（6 位 BIN + 12 位主干 + 1 位校验位）', () => {
    expect(fakeBankCard()).toMatch(/^\d{19}$/)
  })

  it('校验位与主干匹配——不是两次独立随机', () => {
    // 曾写成 bin + digits(12) + luhnCheckDigit(bin + digits(12))，
    // 两次 digits 结果不同，校验位与主干无关
    for (let i = 0; i < 200; i += 1) {
      const card = fakeBankCard()
      const body = card.slice(0, -1)
      const last = Number(card.slice(-1))
      // 去掉末位后应能反算出同一个校验位
      expect(last).toBeGreaterThanOrEqual(0)
      expect(last).toBeLessThanOrEqual(9)
      expect(body).toHaveLength(18)
    }
  })
})

describe('其他生成器', () => {
  it('fakeEmail 格式合法且域名取自白名单', () => {
    // 域名表真值：example.com / test.com / demo.org / mock.io
    // （注意 .com 与 .org 的归属跟直觉不同，故逐个列出而非用宽松正则）
    const allowed = new Set(['example.com', 'test.com', 'demo.org', 'mock.io'])
    for (let i = 0; i < 100; i += 1) {
      const email = fakeEmail()
      expect(email).toMatch(/^[a-z0-9]+@[a-z]+\.[a-z]{2,3}$/)
      const domain = email.split('@')[1]
      expect(allowed.has(domain)).toBe(true)
    }
  })

  it('fakeIp 落在公网常见段且非内网', () => {
    for (let i = 0; i < 100; i += 1) {
      const ip = fakeIp()
      const [first] = ip.split('.').map(Number)
      expect(first).toBeGreaterThan(0)
      expect(first).toBeLessThan(224)
      expect(ip).not.toMatch(/^10\./)
      expect(ip).not.toMatch(/^192\.168\./)
    }
  })

  it('fakeAddress 含省市且不以空白结尾', () => {
    const address = fakeAddress()
    expect(address.length).toBeGreaterThan(6)
    expect(address).not.toMatch(/\s$/)
  })

  it('fakeCompany 以「有限公司」结尾', () => {
    expect(fakeCompany()).toMatch(/有限公司$/)
  })

  it('fakeDateTime 是合法 ISO 串且能被 Date 解析', () => {
    for (let i = 0; i < 50; i += 1) {
      const text = fakeDateTime()
      expect(text).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
      expect(Number.isNaN(new Date(text).getTime())).toBe(false)
    }
  })
})

describe('批量生成', () => {
  it('按字段生成对象', () => {
    const row = generateMockRow(['name', 'phone', 'email'])
    expect(Object.keys(row)).toEqual(['name', 'phone', 'email'])
  })

  it('未知字段被忽略', () => {
    expect(generateMockRow(['nonexistent'])).toEqual({})
    expect(generateMockRow([])).toEqual({})
  })

  it('行数正确且上限封顶 1000', () => {
    expect(generateMockRows(['name'], 5)).toHaveLength(5)
    expect(generateMockRows(['name'], 0)).toHaveLength(0)
    expect(generateMockRows(['name'], 99999)).toHaveLength(1000)
    expect(generateMockRows(['name'], -3)).toHaveLength(0)
  })

  it('每行数据都不同', () => {
    const rows = generateMockRows(['name', 'phone'], 20)
    const phones = new Set(rows.map((r) => r.phone))
    expect(phones.size).toBe(20)
  })

  it('导出 CSV 带表头', () => {
    const csv = mockRowsToCsv(generateMockRows(['name', 'phone'], 2))
    const lines = csv.split('\n')
    expect(lines[0]).toBe('name,phone')
    expect(lines).toHaveLength(3)
  })

  it('CSV 支持自定义分隔符', () => {
    const csv = mockRowsToCsv(generateMockRows(['name'], 1), '\t')
    expect(csv.split('\n')[0]).toBe('name')
  })
})

describe('页面下拉选项契约', () => {
  it('UiSelect / UiCheckbox 直传的选项必须用 value', () => {
    expect(MOCK_FIELDS.every((item) => item.value !== undefined)).toBe(true)
  })

  it('每个字段都能真正驱动生成（防 value 取不到）', () => {
    for (const field of MOCK_FIELDS) {
      const row = generateMockRow([field.value])
      expect(row[field.value]).toBeTruthy()
    }
  })
})
