import { describe, expect, it } from 'vitest'
import {
  CURRENCY_SAMPLES,
  chineseCurrencyToNumber,
  numberToChineseCurrency,
  numberToChineseNumber,
} from '@/common/utils/chinese-number'

describe('numberToChineseCurrency 数字转大写', () => {
  it('逐项核对规范细则', () => {
    const cases = [
      [1234.56, '壹仟贰佰叁拾肆元伍角陆分'],
      [1001, '壹仟零壹元整'],
      [10000, '壹万元整'],
      [10001, '壹万零壹元整'],
      [0.5, '零元伍角'],
      [0.05, '零元零伍分'],
      [10, '壹拾元整'],
      [105, '壹佰零伍元整'],
      [-1234.5, '负壹仟贰佰叁拾肆元伍角'],
    ]
    for (const [input, expected] of cases) {
      expect(numberToChineseCurrency(input)).toBe(expected)
    }
  })

  it('零的处理是全部复杂度的来源', () => {
    // 中间连续两个零只写一个「零」
    expect(numberToChineseCurrency(10001)).toBe('壹万零壹元整')
    expect(numberToChineseCurrency(100000001)).toBe('壹亿零壹元整')
    // 高位为零时不写「零」
    expect(numberToChineseCurrency(1000)).toBe('壹仟元整')
    // 整十不写「零」（壹拾零壹是错的）
    expect(numberToChineseCurrency(11)).toBe('壹拾壹元整')
  })

  it('亿以上按节权处理', () => {
    expect(numberToChineseCurrency(100000000)).toBe('壹亿元整')
    expect(numberToChineseCurrency(123456789)).toBe('壹亿贰仟叁佰肆拾伍万陆仟柒佰捌拾玖元整')
  })

  it('0 与非有限数', () => {
    expect(numberToChineseCurrency(0)).toBe('零元整')
    expect(numberToChineseCurrency('0')).toBe('零元整')
    expect(numberToChineseCurrency(NaN)).toBe('')
    expect(numberToChineseCurrency(Infinity)).toBe('')
    expect(numberToChineseCurrency('abc')).toBe('')
  })

  it('浮点尾数按 toFixed 处理，不出现「伍角零分」这类噪声', () => {
    expect(numberToChineseCurrency(0.1 + 0.2)).toBe('零元叁角')
    // 以下真值均取自 Node 实跑 toFixed(2)，不是十进制直觉：
    //   1.005 → '1.00'（二进制浮点实际略小于 1.005）
    //   1.555 → '1.55'（同上）
    //   1.565 → '1.56'
    expect(numberToChineseCurrency(1.005)).toBe('壹元整')
    expect(numberToChineseCurrency(1.5)).toBe('壹元伍角')
    expect(numberToChineseCurrency(1.555)).toBe('壹元伍角伍分')
    expect(numberToChineseCurrency(1.565)).toBe('壹元伍角陆分')
  })

  it('「整」只在没有任何角分时才加', () => {
    // 规范：有角分就不写「整」，「壹元伍角整」是非规范写法
    expect(numberToChineseCurrency(10)).toBe('壹拾元整')
    expect(numberToChineseCurrency(1.5)).toBe('壹元伍角')
    expect(numberToChineseCurrency(0)).toBe('零元整')
  })

  it('示例集全部可往返', () => {
    for (const item of CURRENCY_SAMPLES) {
      const text = numberToChineseCurrency(item.value)
      const back = chineseCurrencyToNumber(text)
      expect(back.ok).toBe(true)
      expect(back.value).toBeCloseTo(item.value, 2)
    }
  })
})

describe('numberToChineseNumber 纯数字读法', () => {
  it('不带元角分', () => {
    expect(numberToChineseNumber(0)).toBe('零')
    expect(numberToChineseNumber(5)).toBe('伍')
    expect(numberToChineseNumber(11)).toBe('壹拾壹')
    expect(numberToChineseNumber(105)).toBe('壹佰零伍')
    expect(numberToChineseNumber(100000000)).toBe('壹亿')
    expect(numberToChineseNumber(123456789)).toBe('壹亿贰仟叁佰肆拾伍万陆仟柒佰捌拾玖')
  })

  it('非整数与非有限数返回空串', () => {
    expect(numberToChineseNumber(1.5)).toBe('')
    expect(numberToChineseNumber(NaN)).toBe('')
  })
})

describe('chineseCurrencyToNumber 大写转数字', () => {
  it('规范写法全部能解析', () => {
    const cases = [
      ['壹仟贰佰叁拾肆元伍角陆分', 1234.56],
      ['壹佰贰拾叁元肆角伍分', 123.45],
      ['壹佰贰元整', 102],
      ['零元伍角', 0.5],
      ['零元零伍分', 0.05],
      ['壹万元整', 10000],
      ['拾伍元整', 15], // 「拾」省略前导「壹」是规范写法
      ['壹万零壹元整', 10001],
      ['负壹仟贰佰元整', -1200],
    ]
    for (const [input, expected] of cases) {
      const result = chineseCurrencyToNumber(input)
      expect(result.ok).toBe(true)
      expect(result.value).toBeCloseTo(expected, 2)
    }
  })

  it('个位省略单位是合法的', () => {
    // 「肆」后面没有单位，但它是个位的规范省略
    expect(chineseCurrencyToNumber('壹佰贰拾叁元整').value).toBe(123)
  })

  it('宽容处理圆 / 空白 / 结尾整', () => {
    expect(chineseCurrencyToNumber('壹佰贰拾叁圆整').value).toBe(123)
    expect(chineseCurrencyToNumber(' 壹佰贰拾叁 元 整 ').value).toBe(123)
    expect(chineseCurrencyToNumber('壹佰贰拾叁元正').value).toBe(123)
  })

  it('返回规范化后的文本，便于对照', () => {
    const result = chineseCurrencyToNumber('壹佰贰拾叁元肆角伍分')
    expect(result.text).toBe('壹佰贰拾叁元肆角伍分')
  })

  it('非法输入给出原因且不猜测', () => {
    expect(chineseCurrencyToNumber('').ok).toBe(false)
    expect(chineseCurrencyToNumber('伍角').reason).toContain('缺少「元」')
    // 两个裸数字连排没有单位分隔
    expect(chineseCurrencyToNumber('壹贰元整').ok).toBe(false)
    // 不是大写字符
    expect(chineseCurrencyToNumber('一二三元整').ok).toBe(false)
    // 缺「元」时即使字面是数字也不接受
    expect(chineseCurrencyToNumber('壹仟贰佰叁拾肆').ok).toBe(false)
  })

  it('「零元整」合法（有角分又加「整」才冲突）', () => {
    // 0 元是规范写法
    expect(chineseCurrencyToNumber('零元整').ok).toBe(true)
    expect(chineseCurrencyToNumber('零元整').value).toBe(0)
    // 已有角分却再加「整」属非规范
    expect(chineseCurrencyToNumber('壹元伍角整').ok).toBe(false)
    expect(chineseCurrencyToNumber('零元零角整').ok).toBe(false)
  })
})
