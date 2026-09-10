// ============================================================
// 单位换算数据表与换算函数
// 说明：单位表只服务本页面，不属于「跨页面可复用的纯算法」，
//       故按目录规范留在页面 scripts/ 下，不进 common/utils/
// ============================================================

/** 倍率单位：factor 表示 1 个该单位等于多少个基准单位 */
const scale = (factor) => ({
  toBase: (value) => value * factor,
  fromBase: (value) => value / factor,
})

export const UNIT_CATEGORIES = [
  {
    id: 'length',
    label: '长度',
    note: '基准单位为米。英寸 / 英尺 / 码 / 英里 / 海里按国际标准定义换算。',
    defaultUnit: 'm',
    units: [
      { id: 'mm', label: '毫米 mm', ...scale(0.001) },
      { id: 'cm', label: '厘米 cm', ...scale(0.01) },
      { id: 'm', label: '米 m', ...scale(1) },
      { id: 'km', label: '千米 km', ...scale(1000) },
      { id: 'in', label: '英寸 in', ...scale(0.0254) },
      { id: 'ft', label: '英尺 ft', ...scale(0.3048) },
      { id: 'yd', label: '码 yd', ...scale(0.9144) },
      { id: 'mi', label: '英里 mi', ...scale(1609.344) },
      { id: 'nmi', label: '海里 nmi', ...scale(1852) },
    ],
  },
  {
    id: 'mass',
    label: '重量',
    note: '基准单位为千克。斤按市制 1 斤 = 0.5 千克换算。',
    defaultUnit: 'kg',
    units: [
      { id: 'mg', label: '毫克 mg', ...scale(1e-6) },
      { id: 'g', label: '克 g', ...scale(0.001) },
      { id: 'kg', label: '千克 kg', ...scale(1) },
      { id: 't', label: '吨 t', ...scale(1000) },
      { id: 'jin', label: '斤', ...scale(0.5) },
      { id: 'oz', label: '盎司 oz', ...scale(0.028349523125) },
      { id: 'lb', label: '磅 lb', ...scale(0.45359237) },
    ],
  },
  {
    id: 'area',
    label: '面积',
    note: '基准单位为平方米。亩按市制 1 亩 = 2000/3 平方米换算。',
    defaultUnit: 'm2',
    units: [
      { id: 'mm2', label: '平方毫米 mm²', ...scale(1e-6) },
      { id: 'cm2', label: '平方厘米 cm²', ...scale(1e-4) },
      { id: 'm2', label: '平方米 m²', ...scale(1) },
      { id: 'km2', label: '平方千米 km²', ...scale(1e6) },
      { id: 'ha', label: '公顷 ha', ...scale(10000) },
      { id: 'mu', label: '亩', ...scale(2000 / 3) },
      { id: 'ac', label: '英亩 ac', ...scale(4046.8564224) },
      { id: 'ft2', label: '平方英尺 ft²', ...scale(0.09290304) },
    ],
  },
  {
    id: 'volume',
    label: '体积',
    note: '基准单位为升。美制与英制加仑、品脱、液量盎司分别标注。',
    defaultUnit: 'l',
    units: [
      { id: 'ml', label: '毫升 mL', ...scale(0.001) },
      { id: 'l', label: '升 L', ...scale(1) },
      { id: 'm3', label: '立方米 m³', ...scale(1000) },
      { id: 'galus', label: '加仑（美） gal', ...scale(3.785411784) },
      { id: 'galuk', label: '加仑（英） gal', ...scale(4.54609) },
      { id: 'pt', label: '品脱（美） pt', ...scale(0.473176473) },
      { id: 'floz', label: '液量盎司（美） fl oz', ...scale(0.0295735295625) },
    ],
  },
  {
    id: 'data',
    label: '数据存储',
    note: 'KB / MB / GB / TB 按 1000 进制，KiB / MiB / GiB / TiB 按 1024 进制。',
    defaultUnit: 'mb',
    units: [
      { id: 'b', label: '字节 B', ...scale(1) },
      { id: 'kb', label: 'KB（10³）', ...scale(1e3) },
      { id: 'mb', label: 'MB（10⁶）', ...scale(1e6) },
      { id: 'gb', label: 'GB（10⁹）', ...scale(1e9) },
      { id: 'tb', label: 'TB（10¹²）', ...scale(1e12) },
      { id: 'kib', label: 'KiB（2¹⁰）', ...scale(1024) },
      { id: 'mib', label: 'MiB（2²⁰）', ...scale(1048576) },
      { id: 'gib', label: 'GiB（2³⁰）', ...scale(1073741824) },
      { id: 'tib', label: 'TiB（2⁴⁰）', ...scale(1099511627776) },
    ],
  },
  {
    id: 'temperature',
    label: '温度',
    note: '摄氏度为基准。华氏与开尔文为线性偏移换算，不是倍率关系。',
    defaultUnit: 'c',
    units: [
      { id: 'c', label: '摄氏度 °C', toBase: (value) => value, fromBase: (value) => value },
      {
        id: 'f',
        label: '华氏度 °F',
        toBase: (value) => ((value - 32) * 5) / 9,
        fromBase: (value) => (value * 9) / 5 + 32,
      },
      {
        id: 'k',
        label: '开尔文 K',
        toBase: (value) => value - 273.15,
        fromBase: (value) => value + 273.15,
      },
    ],
  },
]

/**
 * 在同一分类内把数值从 fromId 单位换算为 toId 单位
 * @param {number} value 原始数值
 * @param {object} category UNIT_CATEGORIES 中的一项
 * @param {string} fromId 源单位 id
 * @param {string} toId 目标单位 id
 * @returns {number|null} 参数非法时返回 null
 */
export function convertUnit(value, category, fromId, toId) {
  if (!category || !Number.isFinite(value)) return null
  const from = category.units.find((unit) => unit.id === fromId)
  const to = category.units.find((unit) => unit.id === toId)
  if (!from || !to) return null
  return to.fromBase(from.toBase(value))
}
