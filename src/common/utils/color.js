// 颜色格式转换（纯函数，可复用）
// 支持格式：#rgb / #rrggbb / rgb(r,g,b) / hsl(h,s%,l%)

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/** hex(#rgb / #rrggbb，可带 #) → { r, g, b }，非法返回 null */
export function hexToRgb(hex) {
  if (typeof hex !== 'string') return null
  let value = hex.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    value = value
      .split('')
      .map((ch) => ch + ch)
      .join('')
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

/** { r, g, b } → #rrggbb（小写） */
export function rgbToHex(r, g, b) {
  const toHex = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** { r, g, b } → { h, s, l }（h: 0-360，s/l: 0-100） */
export function rgbToHsl(r, g, b) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const l = (max + min) / 2

  let h = 0
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/** { h, s, l } → { r, g, b } */
export function hslToRgb(h, s, l) {
  const hn = ((h % 360) + 360) % 360
  const sn = clamp(s, 0, 100) / 100
  const ln = clamp(l, 0, 100) / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1))
  const m = ln - c / 2

  const table = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][Math.floor(hn / 60) % 6]

  return {
    r: Math.round((table[0] + m) * 255),
    g: Math.round((table[1] + m) * 255),
    b: Math.round((table[2] + m) * 255),
  }
}

/** rgb(...) / rgba(...) 字符串 → { r, g, b }，非法返回 null */
export function rgbStringToRgb(input) {
  const match = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(String(input).trim())
  if (!match) return null
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) }
}

/** hsl(...) / hsla(...) 字符串 → { h, s, l }，非法返回 null */
export function hslStringToHsl(input) {
  const match = /^hsla?\(\s*([\d.]+)[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?/i.exec(String(input).trim())
  if (!match) return null
  return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) }
}

/**
 * 任意支持的格式 → 统一颜色对象
 * @returns {{ ok: boolean, rgb: {r,g,b}|null, hsl: {h,s,l}|null, hex: string|null, source: string }}
 */
export function parseColor(input) {
  const raw = String(input ?? '').trim()
  if (!raw) return { ok: false, rgb: null, hsl: null, hex: null, source: raw }

  let rgb = null
  if (/^(#|hex)/i.test(raw) || /^[0-9a-fA-F]{3,6}$/.test(raw)) {
    rgb = hexToRgb(raw)
  } else if (/^hsla?\(/i.test(raw)) {
    const hsl = hslStringToHsl(raw)
    if (hsl) rgb = hslToRgb(hsl.h, hsl.s, hsl.l)
  } else {
    rgb = rgbStringToRgb(raw)
  }

  if (!rgb) return { ok: false, rgb: null, hsl: null, hex: null, source: raw }
  const clamped = {
    r: clamp(Math.round(rgb.r), 0, 255),
    g: clamp(Math.round(rgb.g), 0, 255),
    b: clamp(Math.round(rgb.b), 0, 255),
  }
  return {
    ok: true,
    rgb: clamped,
    hsl: rgbToHsl(clamped.r, clamped.g, clamped.b),
    hex: rgbToHex(clamped.r, clamped.g, clamped.b),
    source: raw,
  }
}

/** 相对亮度（WCAG），取值 0-1 */
export function relativeLuminance({ r, g, b }) {
  const channel = (v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** 两个 rgb 的对比度，取值 1-21 */
export function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1)
  const l2 = relativeLuminance(rgb2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}
