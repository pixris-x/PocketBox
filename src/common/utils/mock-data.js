// ============================================================
// 测试用假数据生成（无副作用、无 DOM 依赖）
//
// 随机源用 Web Crypto，不用 Math.random ——
// 同一批种子重跑能复现，且不会被预测。
//
// 重要约束：生成的号码类数据（身份证 / 银行卡 / 手机号）
// **必须真能通过本站对应的校验算法**，否则测试时会被校验拦下，
// 反而搞不清是数据问题还是校验有 bug。
// ============================================================

import { idCardCheckDigit } from './idcard-mask'
import { luhnCheckDigit } from './checksum'
import { jsonToCsv } from './csv'

const SURNAMES =
  '王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤'
const GIVEN_CHARS =
  '伟芳娜秀英敏静丽强磊洋艳勇军杰娟涛明超秀霞平刚桂英建华文博宇轩浩然子涵欣怡雨桐思远志强晓峰'

const CITIES = [
  { province: '北京市', city: '朝阳区', area: '望京街道' },
  { province: '上海市', city: '浦东新区', area: '张江镇' },
  { province: '广东省', city: '深圳市', area: '南山区' },
  { province: '广东省', city: '广州市', area: '天河区' },
  { province: '浙江省', city: '杭州市', area: '西湖区' },
  { province: '江苏省', city: '南京市', area: '鼓楼区' },
  { province: '四川省', city: '成都市', area: '武侯区' },
  { province: '湖北省', city: '武汉市', area: '洪山区' },
  { province: '陕西省', city: '西安市', area: '雁塔区' },
  { province: '福建省', city: '厦门市', area: '思明区' },
]

const STREETS = [
  '科技路',
  '人民路',
  '解放大道',
  '建设街',
  '中山北路',
  '文化东路',
  '光明巷',
  '幸福里',
]
const BUILDINGS = ['A 座', 'B 座', '3 号楼', '12 号楼', '阳光公寓', '翠湖天地']

const DOMAINS = ['example.com', 'test.com', 'demo.org', 'mock.io']
const COMPANIES = ['云智科技', '星河网络', '明道数据', '青禾信息', '海川软件', '晨曦智能']

// ============================================================
// 随机源（与 random 页同策略：Web Crypto + 拒绝采样）
// ============================================================

/** 取 [0, max) 的随机整数；用拒绝采样消除取模偏差 */
export function randomInt(max) {
  if (max <= 0) return 0
  const cryptoObj = globalThis.crypto
  if (cryptoObj?.getRandomValues) {
    const range = 0x100000000
    const limit = range - (range % max)
    const buf = new Uint32Array(1)
    do {
      cryptoObj.getRandomValues(buf)
    } while (buf[0] >= limit)
    return buf[0] % max
  }
  return Math.floor(Math.random() * max)
}

function pick(list) {
  return list[randomInt(list.length)]
}

function digits(length) {
  let out = ''
  for (let i = 0; i < length; i += 1) out += randomInt(10)
  return out
}

// ============================================================
// 各类数据生成
// ============================================================

/** 随机中文姓名 */
export function fakeName() {
  const surname = SURNAMES[randomInt(SURNAMES.length)]
  const length = randomInt(2) === 0 ? 1 : 1 + randomInt(2)
  let given = ''
  for (let i = 0; i < length; i += 1) {
    given += GIVEN_CHARS[randomInt(GIVEN_CHARS.length)]
  }
  return surname + given
}

/** 随机手机号：号段从三个运营商的真实段位里取 */
export function fakePhone() {
  const prefixes = [
    '130',
    '131',
    '132',
    '133',
    '134',
    '135',
    '136',
    '137',
    '138',
    '139',
    '150',
    '151',
    '152',
    '153',
    '155',
    '156',
    '157',
    '158',
    '159',
    '166',
    '170',
    '175',
    '176',
    '180',
    '181',
    '182',
    '183',
    '184',
    '185',
    '186',
    '187',
    '188',
    '189',
    '199',
  ]
  return pick(prefixes) + digits(8)
}

/**
 * 随机身份证：地区码 + 生日 + 顺序码，末位用 GB 11643 算法算出
 * 这样生成的数据能通过 validateIdCard 校验
 */
export function fakeIdCard() {
  const province = pick(['11', '31', '44', '33', '32', '51', '42', '61', '35', '50'])
  const city = String(1 + randomInt(20)).padStart(2, '0')
  const district = String(1 + randomInt(20)).padStart(2, '0')
  const year = 1950 + randomInt(60)
  const month = 1 + randomInt(12)
  const maxDay = new Date(year, month, 0).getDate()
  const day = 1 + randomInt(maxDay)
  const sequence = String(randomInt(1000)).padStart(3, '0')
  // 6 位地区码（省 2 + 市 2 + 区 2）+ 8 位生日 + 3 位顺序码 = 前 17 位
  const body = `${province}${city}${district}${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}${sequence}`
  return body + idCardCheckDigit(body)
}

/**
 * 随机银行卡：BIN 取常见卡组织，末位用 Luhn 反算
 *
 * ⚠ 主干只能生成一次。曾写成 `bin + digits(12) + luhnCheckDigit(bin + digits(12))`，
 * 两次 `digits(12)` 结果不同，校验位与实际主干无关 —— 生成的数据过不了本站校验器，
 * 且长度也会随两次结果错位。
 */
export function fakeBankCard() {
  const bin = pick(['622202', '621700', '622848', '453212', '622588', '621661'])
  const body = bin + digits(12)
  return body + luhnCheckDigit(body)
}

/** 随机邮箱：本地部分由姓名拼音风格拼出 */
export function fakeEmail(name = fakeName()) {
  const pinyin = Pinyin_TABLE[name] || 'user'
  return `${pinyin}${digits(4)}@${pick(DOMAINS)}`
}

/** 极简拼音映射：只覆盖示例里常见的中文名首字，取不到就退回 user */
const Pinyin_TABLE = {
  王: 'wang',
  李: 'li',
  张: 'zhang',
  刘: 'liu',
  陈: 'chen',
  杨: 'yang',
  黄: 'huang',
  赵: 'zhao',
  吴: 'wu',
  周: 'zhou',
  徐: 'xu',
  孙: 'sun',
  马: 'ma',
  朱: 'zhu',
  胡: 'hu',
  郭: 'guo',
  何: 'he',
  高: 'gao',
  林: 'lin',
  罗: 'luo',
  郑: 'zheng',
  梁: 'liang',
  谢: 'xie',
  宋: 'song',
  唐: 'tang',
  许: 'xu',
  韩: 'han',
  冯: 'feng',
  伟: 'wei',
  芳: 'fang',
  娜: 'na',
  秀: 'xiu',
  英: 'ying',
  敏: 'min',
  静: 'jing',
  丽: 'li',
  强: 'qiang',
  磊: 'lei',
  洋: 'yang',
  艳: 'yan',
  勇: 'yong',
  军: 'jun',
  杰: 'jie',
  娟: 'juan',
  涛: 'tao',
  明: 'ming',
  超: 'chao',
  霞: 'xia',
  平: 'ping',
  刚: 'gang',
  华: 'hua',
  建: 'jian',
  文: 'wen',
  博: 'bo',
  宇: 'yu',
  轩: 'xuan',
}

/** 随机地址 */
export function fakeAddress() {
  const region = pick(CITIES)
  return `${region.province}${region.city}${region.area}${pick(STREETS)}${randomInt(999) + 1}号${pick(BUILDINGS)}`
}

/** 随机公司名 */
export function fakeCompany() {
  return `${pick(COMPANIES)}有限公司`
}

/** 随机 IP：避开内网与组播段，保证看起来像真实公网地址 */
export function fakeIp() {
  const first = pick([
    1, 8, 13, 27, 36, 39, 42, 58, 59, 101, 111, 113, 116, 121, 123, 175, 180, 182, 202, 203, 218,
    220, 221, 222,
  ])
  return `${first}.${randomInt(256)}.${randomInt(256)}.${1 + randomInt(254)}`
}

/** 随机时间字符串（ISO 格式） */
export function fakeDateTime({ startYear = 2020, endYear = 2026 } = {}) {
  const year = startYear + randomInt(endYear - startYear + 1)
  const month = 1 + randomInt(12)
  const day = 1 + randomInt(new Date(year, month, 0).getDate())
  const hour = randomInt(24)
  const minute = randomInt(60)
  const second = randomInt(60)
  const pad = (n) => String(n).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`
}

/** 工具页可勾选的数据字段（value 即生成器函数名） */
export const MOCK_FIELDS = [
  { value: 'name', label: '姓名' },
  { value: 'phone', label: '手机号' },
  { value: 'idcard', label: '身份证' },
  { value: 'bankcard', label: '银行卡' },
  { value: 'email', label: '邮箱' },
  { value: 'address', label: '地址' },
  { value: 'company', label: '公司' },
  { value: 'ip', label: 'IP 地址' },
  { value: 'date', label: '时间' },
]

/**
 * 批量生成一行假数据
 * @param {string[]} fields 见 MOCK_FIELDS 的 value
 * @returns {object} 键为字段名
 */
export function generateMockRow(fields) {
  const row = {}
  for (const field of fields || []) {
    switch (field) {
      case 'name':
        row.name = fakeName()
        break
      case 'phone':
        row.phone = fakePhone()
        break
      case 'idcard':
        row.idcard = fakeIdCard()
        break
      case 'bankcard':
        row.bankcard = fakeBankCard()
        break
      case 'email':
        row.email = fakeEmail()
        break
      case 'address':
        row.address = fakeAddress()
        break
      case 'company':
        row.company = fakeCompany()
        break
      case 'ip':
        row.ip = fakeIp()
        break
      case 'date':
        row.date = fakeDateTime()
        break
      default:
        break
    }
  }
  return row
}

/**
 * 批量生成多行
 * @param {string[]} fields
 * @param {number} count
 * @returns {object[]}
 */
export function generateMockRows(fields, count) {
  const total = Math.max(0, Math.min(1000, Number(count) || 0))
  const rows = []
  for (let i = 0; i < total; i += 1) rows.push(generateMockRow(fields))
  return rows
}

/**
 * 导出为 CSV
 * @param {object[]} rows
 * @param {string} [delimiter]
 * @returns {string}
 */
export function mockRowsToCsv(rows, delimiter = ',') {
  return jsonToCsv(rows, { delimiter })
}
