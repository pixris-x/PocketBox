import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  hexToRgb,
  hslStringToHsl,
  hslToRgb,
  parseColor,
  relativeLuminance,
  rgbStringToRgb,
  rgbToHex,
  rgbToHsl,
} from '@/common/utils/color'

const WHITE = { r: 255, g: 255, b: 255 }
const BLACK = { r: 0, g: 0, b: 0 }

describe('hexToRgb', () => {
  it('六位十六进制', () => {
    expect(hexToRgb('#ffffff')).toEqual(WHITE)
    expect(hexToRgb('#000000')).toEqual(BLACK)
    expect(hexToRgb('#f97316')).toEqual({ r: 249, g: 115, b: 22 })
  })

  it('三位简写自动补齐', () => {
    expect(hexToRgb('#fff')).toEqual(WHITE)
    expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 })
  })

  it('可省略 # 号，并容忍首尾空白', () => {
    expect(hexToRgb('ffffff')).toEqual(WHITE)
    expect(hexToRgb('  #fff  ')).toEqual(WHITE)
  })

  it('大小写均可', () => {
    expect(hexToRgb('#FFF')).toEqual(WHITE)
    expect(hexToRgb('#AbCdEf')).toEqual({ r: 171, g: 205, b: 239 })
  })

  it('非法输入返回 null', () => {
    expect(hexToRgb('#ffff')).toBe(null)
    expect(hexToRgb('#gggggg')).toBe(null)
    expect(hexToRgb('')).toBe(null)
    expect(hexToRgb(null)).toBe(null)
    expect(hexToRgb(123)).toBe(null)
  })
})

describe('rgbToHex', () => {
  it('基本转换，输出小写且带 #', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
  })

  it('超出范围的通道被夹到 0~255', () => {
    expect(rgbToHex(300, -5, 128)).toBe('#ff0080')
  })

  it('小数四舍五入', () => {
    expect(rgbToHex(1.6, 2.4, 3.5)).toBe('#020204')
  })

  it('与 hexToRgb 互为逆运算', () => {
    const rgb = hexToRgb('#f97316')
    expect(rgbToHex(rgb.r, rgb.g, rgb.b)).toBe('#f97316')
  })
})

describe('rgbToHsl', () => {
  it('三原色', () => {
    expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 100, l: 50 })
    expect(rgbToHsl(0, 255, 0)).toEqual({ h: 120, s: 100, l: 50 })
    expect(rgbToHsl(0, 0, 255)).toEqual({ h: 240, s: 100, l: 50 })
  })

  it('灰阶饱和度为 0', () => {
    expect(rgbToHsl(0, 0, 0)).toEqual({ h: 0, s: 0, l: 0 })
    expect(rgbToHsl(255, 255, 255)).toEqual({ h: 0, s: 0, l: 100 })
    expect(rgbToHsl(128, 128, 128)).toEqual({ h: 0, s: 0, l: 50 })
  })

  it('色相落在 0~360 区间', () => {
    for (const rgb of [
      [255, 128, 0],
      [0, 255, 128],
      [128, 0, 255],
      [255, 0, 128],
    ]) {
      const { h } = rgbToHsl(...rgb)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThan(360)
    }
  })
})

describe('hslToRgb', () => {
  it('基本色', () => {
    expect(hslToRgb(0, 100, 50)).toEqual({ r: 255, g: 0, b: 0 })
    expect(hslToRgb(120, 100, 50)).toEqual({ r: 0, g: 255, b: 0 })
    expect(hslToRgb(240, 100, 50)).toEqual({ r: 0, g: 0, b: 255 })
  })

  it('亮度极值给黑白', () => {
    expect(hslToRgb(0, 0, 100)).toEqual(WHITE)
    expect(hslToRgb(0, 0, 0)).toEqual(BLACK)
  })

  it('色相超出 360 时循环', () => {
    expect(hslToRgb(360, 100, 50)).toEqual(hslToRgb(0, 100, 50))
    expect(hslToRgb(480, 100, 50)).toEqual(hslToRgb(120, 100, 50))
    expect(hslToRgb(-120, 100, 50)).toEqual(hslToRgb(240, 100, 50))
  })

  it('饱和度与亮度被夹到 0~100', () => {
    expect(hslToRgb(0, 200, 50)).toEqual(hslToRgb(0, 100, 50))
    expect(hslToRgb(0, -50, 50)).toEqual(hslToRgb(0, 0, 50))
  })
})

describe('rgb ↔ hsl 往返', () => {
  it('原色往返完全一致', () => {
    for (const rgb of [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 255],
      [0, 0, 0],
    ]) {
      const hsl = rgbToHsl(...rgb)
      const back = hslToRgb(hsl.h, hsl.s, hsl.l)
      expect([back.r, back.g, back.b]).toEqual(rgb)
    }
  })

  it('任意色往返误差在 2 以内（h/s/l 取整带来的损失）', () => {
    for (const rgb of [
      [18, 52, 86],
      [249, 115, 22],
      [123, 45, 200],
      [37, 200, 91],
    ]) {
      const hsl = rgbToHsl(...rgb)
      const back = hslToRgb(hsl.h, hsl.s, hsl.l)
      expect(Math.abs(back.r - rgb[0])).toBeLessThanOrEqual(2)
      expect(Math.abs(back.g - rgb[1])).toBeLessThanOrEqual(2)
      expect(Math.abs(back.b - rgb[2])).toBeLessThanOrEqual(2)
    }
  })
})

describe('rgbStringToRgb / hslStringToHsl', () => {
  it('解析 rgb 与 rgba', () => {
    expect(rgbStringToRgb('rgb(1,2,3)')).toEqual({ r: 1, g: 2, b: 3 })
    expect(rgbStringToRgb('rgba(1, 2, 3, 0.5)')).toEqual({ r: 1, g: 2, b: 3 })
    expect(rgbStringToRgb('RGB(10,20,30)')).toEqual({ r: 10, g: 20, b: 30 })
  })

  it('解析空格分隔写法', () => {
    expect(rgbStringToRgb('rgb(1 2 3)')).toEqual({ r: 1, g: 2, b: 3 })
  })

  it('非法输入返回 null', () => {
    expect(rgbStringToRgb('nope')).toBe(null)
    expect(rgbStringToRgb('#fff')).toBe(null)
  })

  it('解析 hsl 与 hsla（百分号可选）', () => {
    expect(hslStringToHsl('hsl(120, 50%, 50%)')).toEqual({ h: 120, s: 50, l: 50 })
    expect(hslStringToHsl('hsla(120,50%,50%,0.3)')).toEqual({ h: 120, s: 50, l: 50 })
    expect(hslStringToHsl('hsl(120, 50, 50)')).toEqual({ h: 120, s: 50, l: 50 })
  })

  it('非法输入返回 null', () => {
    expect(hslStringToHsl('rgb(1,2,3)')).toBe(null)
  })
})

describe('parseColor', () => {
  it('识别 hex 并给出统一结果', () => {
    const result = parseColor('#fff')
    expect(result.ok).toBe(true)
    expect(result.rgb).toEqual(WHITE)
    expect(result.hex).toBe('#ffffff')
    expect(result.hsl).toEqual({ h: 0, s: 0, l: 100 })
  })

  it('识别 rgb 字符串', () => {
    const result = parseColor('rgb(255,0,0)')
    expect(result).toMatchObject({ ok: true, hex: '#ff0000', rgb: { r: 255, g: 0, b: 0 } })
  })

  it('识别 hsl 字符串', () => {
    const result = parseColor('hsl(0,100%,50%)')
    expect(result).toMatchObject({ ok: true, hex: '#ff0000' })
  })

  it('识别不带 # 的十六进制', () => {
    expect(parseColor('ff8800')).toMatchObject({ ok: true, hex: '#ff8800' })
  })

  it('超范围通道被夹紧', () => {
    expect(parseColor('rgb(300,400,0)')).toMatchObject({ ok: true, hex: '#ffff00' })
  })

  // 说明：通道值正则不接收负号，rgb(-10,0,0) 会被判为非法而非夹紧到 0。
  // 属于实现的已知边界，不在测试中固化。
  it('带负号的通道不被解析', () => {
    expect(parseColor('rgb(-10,0,0)')).toMatchObject({ ok: false })
  })

  it('空值与非颜色文本返回 ok:false', () => {
    expect(parseColor('')).toMatchObject({ ok: false, rgb: null, hex: null })
    expect(parseColor('   ')).toMatchObject({ ok: false })
    expect(parseColor('这不是颜色')).toMatchObject({ ok: false })
    expect(parseColor(null)).toMatchObject({ ok: false })
  })

  it('保留来源文本', () => {
    expect(parseColor('  #fff  ').source).toBe('#fff')
  })
})

describe('相对亮度与对比度（WCAG）', () => {
  it('纯白为 1、纯黑为 0', () => {
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 10)
    expect(relativeLuminance(BLACK)).toBe(0)
  })

  it('黑白对比度为 21 的上限', () => {
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 10)
  })

  it('与自身对比度为 1', () => {
    expect(contrastRatio(WHITE, WHITE)).toBe(1)
    expect(contrastRatio({ r: 18, g: 52, b: 86 }, { r: 18, g: 52, b: 86 })).toBe(1)
  })

  it('对比度与参数顺序无关', () => {
    const a = { r: 249, g: 115, b: 22 }
    expect(contrastRatio(WHITE, a)).toBeCloseTo(contrastRatio(a, WHITE), 10)
  })

  it('#767676 对白色约为 4.54（WCAG AA 临界灰）', () => {
    expect(contrastRatio({ r: 118, g: 118, b: 118 }, WHITE)).toBeCloseTo(4.54, 1)
  })
})
