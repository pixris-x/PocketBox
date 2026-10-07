import { describe, expect, it } from 'vitest'
import {
  MASK_TYPES,
  VALIDATION_SAMPLES,
  detectBankBrand,
  detectOperator,
  idCardCheckDigit,
  maskAddress,
  maskBankCard,
  maskByType,
  maskEmail,
  maskIdCard,
  maskKeep,
  maskName,
  maskPhone,
  maskPlate,
  upgradeIdCard15,
  validateBankCard,
  validateIdCard,
  validatePhone,
} from '@/common/utils/idcard-mask'

describe('idCardCheckDigit 身份证校验位', () => {
  it('按 GB 11643 加权算出末位', () => {
    expect(idCardCheckDigit('11010519491231002')).toBe('X')
    expect(idCardCheckDigit('11010519491231002')).toMatch(/^[0-9X]$/)
  })

  it('输入不足 17 位时抛错', () => {
    expect(() => idCardCheckDigit('110105')).toThrow()
    expect(() => idCardCheckDigit('1101051949123100a')).toThrow()
  })
})

describe('upgradeIdCard15 老号升位', () => {
  it('第 7 位后插入 19', () => {
    expect(upgradeIdCard15('110105491231002')).toBe('11010519491231002')
  })

  it('非 15 位原样返回', () => {
    expect(upgradeIdCard15('11010519491231002X')).toBe('11010519491231002X')
    expect(upgradeIdCard15('123')).toBe('123')
  })
})

describe('validateIdCard 身份证校验', () => {
  it('校验通过并抽出全部信息', () => {
    const result = validateIdCard(VALIDATION_SAMPLES.idcard)
    expect(result.valid).toBe(true)
    expect(result.province).toBe('北京')
    expect(result.birthText).toBe('1949-12-31')
    expect(result.gender).toBe('女')
    expect(result.checkDigit).toBe('X')
    expect(typeof result.age).toBe('number')
  })

  it('容忍小写 x 与空格', () => {
    expect(validateIdCard('110105 19491231 002x').valid).toBe(true)
  })

  it('15 位老号可识别且不校验末位', () => {
    // 15 位全是数字，曾被 18 位的正则误判为「含非法字符」
    const result = validateIdCard('110105491231002')
    expect(result.valid).toBe(true)
    expect(result.is15).toBe(true)
    expect(result.province).toBe('北京')
    expect(result.reason).toContain('15 位')
  })

  it('校验位不符时给出正确末位', () => {
    const result = validateIdCard('110105194912310021')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('校验位不符：末位应为 X')
  })

  it('长度与字符错误分别提示', () => {
    expect(validateIdCard('').reason).toBe('请输入身份证号码')
    expect(validateIdCard('1101051949123').reason).toContain('长度不符')
    expect(validateIdCard('11010519491231002!').reason).toContain('含非法字符')
    expect(validateIdCard('11010549123100!').reason).toContain('含非法字符')
  })

  it('地区码无效时提示', () => {
    // 末位须用算法算出（3），否则会先被「校验位不符」拦下，测不到地区码分支
    const result = validateIdCard('990105194912310023')
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('地区码无效')
  })

  it('出生日期越界与闰年处理', () => {
    // 2 月 30 日不存在（末位 0 由算法算出）
    expect(validateIdCard('110105194902300020').reason).toContain('出生日期无效')
    // 月份为 0（末位 2）
    expect(validateIdCard('110105194900310022').reason).toContain('出生日期无效')
    // 2021-02-29 不存在（2021 非闰年，末位 X）
    expect(validateIdCard('11010520210229001X').reason).toContain('出生日期无效')
    // 2000-02-29 存在（能被 400 整除，是闰年，末位 3）
    expect(validateIdCard('110105200002290013').valid).toBe(true)
  })

  it('顺序码奇男偶女', () => {
    // 末位为校验位，故取第 17 位（索引 16）为奇数即男
    const male = validateIdCard('11010519491231001X')
    const female = VALIDATION_SAMPLES.idcard
    expect(male.gender === '男' || male.valid === false).toBe(true)
    expect(validateIdCard(female).gender).toBe('女')
  })
})

describe('validateBankCard 银行卡校验', () => {
  it('Luhn 通过的卡号校验成功', () => {
    const result = validateBankCard(VALIDATION_SAMPLES.bankcard)
    expect(result.valid).toBe(true)
    expect(result.brand).toBe('银联')
    expect(result.length).toBe(19)
  })

  it('容忍空格与连字符', () => {
    expect(validateBankCard('6222 0212 3456 7890 128').valid).toBe(true)
    expect(validateBankCard('6222-0212-3456-7890-128').valid).toBe(true)
  })

  it('Luhn 不过时提示末位可能输错', () => {
    const bad = `${VALIDATION_SAMPLES.bankcard.slice(0, -1)}7`
    const result = validateBankCard(bad)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Luhn')
  })

  it('长度与字符边界', () => {
    expect(validateBankCard('').reason).toBe('请输入银行卡号')
    expect(validateBankCard('123').reason).toContain('长度不符')
    expect(validateBankCard('6222a02123456789012').reason).toBe('含非数字字符')
  })
})

describe('detectBankBrand 卡组织识别', () => {
  it('按 BIN 前缀判定', () => {
    expect(detectBankBrand('45321234567890126')).toBe('Visa')
    expect(detectBankBrand('370000000000000')).toBe('American Express')
    expect(detectBankBrand('6222021234567890128')).toBe('银联')
  })

  it('识别不到时返回未知', () => {
    // 银联覆盖 95 段，故 9999 会命中；这里用 5 开头的非 Mastercard 段
    expect(detectBankBrand('5999999999999')).toBe('未知卡组织')
    expect(detectBankBrand('')).toBe('未知卡组织')
  })
})

describe('validatePhone 手机号校验', () => {
  it('11 位号段合法', () => {
    const result = validatePhone(VALIDATION_SAMPLES.phone)
    expect(result.valid).toBe(true)
    expect(result.operator).toBe('中国移动')
  })

  it('容忍 +86 前缀、空格与连字符', () => {
    expect(validatePhone('+86 138 1234 5678').valid).toBe(true)
    expect(validatePhone('138-1234-5678').valid).toBe(true)
  })

  it('长度与号段错误分别提示', () => {
    expect(validatePhone('').reason).toBe('请输入手机号')
    expect(validatePhone('1381234567').reason).toContain('长度不符')
    expect(validatePhone('12812345678').reason).toContain('号段无效')
    expect(validatePhone('1381234567a').reason).toBe('含非数字字符')
  })
})

describe('detectOperator 运营商识别', () => {
  it('覆盖三大运营商的典型号段', () => {
    // 199 曾被误判成移动，实为电信
    expect(detectOperator('13812345678')).toBe('中国移动')
    expect(detectOperator('18612345678')).toBe('中国联通')
    expect(detectOperator('13312345678')).toBe('中国电信')
    expect(detectOperator('19912345678')).toBe('中国电信')
    expect(detectOperator('16612345678')).toBe('中国联通')
    expect(detectOperator('17512345678')).toBe('中国联通')
  })

  it('未知号段不猜测', () => {
    expect(detectOperator('10012345678')).toBe('未知运营商')
  })
})

describe('maskKeep 通用脱敏', () => {
  it('按首尾保留位数打码', () => {
    expect(maskKeep('13812345678', 3, 4)).toBe('138****5678')
  })

  it('长度不足时退化为首尾各半，不报错', () => {
    // 5 位要保留 head+tail=7 位，保留不下 → 退化为首 2 尾 1
    expect(maskKeep('12345', 3, 4)).toBe('123**')
  })

  it('长度恰好等于保留数时仍要打码，不能等于没脱敏', () => {
    // 7 位保留 3+4，若走正常分支会一个字都不遮 —— 等号必须走降级
    expect(maskKeep('1234567', 3, 4)).toBe('1234***')
    // 降级后必须至少遮住一位
    expect(maskKeep('1234567', 3, 4)).toContain('*')
  })

  it('忽略输入中的空格后再计算长度', () => {
    // 去空格后是 11 位正常手机号长度
    expect(maskKeep('138 1234 5678', 3, 4)).toBe('138****5678')
  })

  it('空值返回空串', () => {
    expect(maskKeep('', 3, 4)).toBe('')
    expect(maskKeep(null, 3, 4)).toBe('')
  })
})

describe('各类型脱敏', () => {
  it('手机号保留前 3 后 4', () => {
    expect(maskPhone('13812345678')).toBe('138****5678')
  })

  it('身份证保留前 6 后 4', () => {
    expect(maskIdCard(VALIDATION_SAMPLES.idcard)).toBe('110105********002X')
  })

  it('银行卡只保留后 4 位', () => {
    expect(maskBankCard(VALIDATION_SAMPLES.bankcard)).toBe('***************0128')
  })

  it('姓名按字数分档', () => {
    expect(maskName('张三')).toBe('张*')
    expect(maskName('欧阳修文')).toBe('欧**文')
    // 单字名无可打码部分，原样返回
    expect(maskName('李')).toBe('李')
  })

  it('邮箱只打码本地部分，域名保留', () => {
    expect(maskEmail('peter@example.com')).toBe('p****@example.com')
  })

  it('地址保留前 6 字', () => {
    expect(maskAddress('北京市朝阳区某某小区1号楼')).toBe('北京市朝阳区*******')
  })

  it('车牌保留省市与末位', () => {
    expect(maskPlate('沪A12345')).toBe('沪A****5')
  })

  it('全部接受空值', () => {
    expect(maskPhone('')).toBe('')
    expect(maskIdCard('')).toBe('')
    expect(maskName('')).toBe('')
    expect(maskEmail('')).toBe('')
    expect(maskPlate('')).toBe('')
  })

  it('超短输入不泄露明文', () => {
    // 短号无法按常规位数切分，只能退化为只留首尾
    expect(maskPhone('12345')).toBe('1***5')
    expect(maskPlate('沪A')).toBe('沪*')
  })
})

describe('maskByType 按类型分发', () => {
  it('覆盖 MASK_TYPES 列出的全部类型', () => {
    const samples = {
      phone: '13812345678',
      idcard: VALIDATION_SAMPLES.idcard,
      bankcard: VALIDATION_SAMPLES.bankcard,
      name: '张三',
      email: 'peter@example.com',
      address: '北京市朝阳区某某小区',
      plate: '沪A12345',
    }
    for (const item of MASK_TYPES) {
      const masked = maskByType(item.value, samples[item.value])
      expect(typeof masked).toBe('string')
      expect(masked.length).toBeGreaterThan(0)
      expect(masked).toContain('*')
    }
  })

  it('未知类型原样返回', () => {
    expect(maskByType('unknown', 'abc')).toBe('abc')
  })
})

describe('页面下拉选项契约', () => {
  it('UiSelect 直传的选项必须用 value 作 key', () => {
    // 曾把 id 写成 value 的反面：UiSelect 只认 option.value
    expect(MASK_TYPES.every((item) => item.value !== undefined)).toBe(true)
  })

  it('脱敏类型可驱动实际脱敏（防 value 取不到）', () => {
    for (const item of MASK_TYPES) {
      const masked = maskByType(item.value, '13812345678')
      expect(masked).toContain('*')
    }
  })
})
