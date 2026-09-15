import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  createXdbSearcher,
  describeRegion,
  parseRegionText,
  readXdbHeader,
} from '@/common/utils/ip-region'
import { parseIpv4 } from '@/common/utils/ip-subnet'

const HEADER_SIZE = 256
const SEGMENT_SIZE = 14
const VECTOR_INDEX_SIZE = 512 * 1024
const DATA_START = HEADER_SIZE + VECTOR_INDEX_SIZE

const errMsg = (fn) => {
  try {
    fn()
  } catch (e) {
    return e.message
  }
  return null
}

/**
 * 按实测的 xdb 布局合成一个最小可用数据库，用于精确控制边界。
 * 注意 endIndexPtr 指向「末段起点」，所以 endIndexPtr + 14 才是文件总长。
 */
function buildXdb(rows) {
  const encoder = new TextEncoder()
  const payloads = rows.map((row) => encoder.encode(row.region))
  const payloadLength = payloads.reduce((sum, p) => sum + p.length, 0)

  const startIndexPtr = DATA_START + payloadLength
  const endIndexPtr = startIndexPtr + SEGMENT_SIZE * (rows.length - 1)
  const buffer = new ArrayBuffer(endIndexPtr + SEGMENT_SIZE)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  view.setUint32(0, 0x00010003, true)
  view.setUint32(4, 1755000000, true)
  view.setUint32(8, startIndexPtr, true)
  view.setUint32(12, endIndexPtr, true)

  const pointers = []
  let cursor = DATA_START
  for (const payload of payloads) {
    bytes.set(payload, cursor)
    pointers.push(cursor)
    cursor += payload.length
  }

  rows.forEach((row, i) => {
    const offset = startIndexPtr + i * SEGMENT_SIZE
    view.setUint32(offset, parseIpv4(row.start), true)
    view.setUint32(offset + 4, parseIpv4(row.end), true)
    view.setUint16(offset + 8, payloads[i].length, true)
    view.setUint32(offset + 10, pointers[i], true)
  })

  return buffer
}

const ROWS = [
  { start: '0.0.0.0', end: '0.0.255.255', region: 'Reserved|Reserved|Reserved|0|0' },
  { start: '1.0.0.0', end: '1.0.0.255', region: '澳大利亚|昆士兰|布里斯班|0|AU' },
  { start: '8.8.8.0', end: '8.8.8.255', region: 'United States|California|0|Google LLC|US' },
  { start: '192.168.0.0', end: '192.168.255.255', region: 'Reserved|Reserved|Reserved|0|0' },
  { start: '255.254.0.0', end: '255.254.255.255', region: 'Reserved|Reserved|Reserved|0|0' },
]

const XDB = buildXdb(ROWS)

describe('readXdbHeader', () => {
  it('解析版本、生成时间与段数', () => {
    const header = readXdbHeader(XDB)
    expect(header.version).toBe(0x00010003)
    expect(header.createdAt).toBe(1755000000)
    // region 串按 UTF-8 写入 payload，中文占多字节，不能用字符串 length 当字节数
    const payloadBytes = new TextEncoder().encode(ROWS.map((r) => r.region).join('')).length
    expect(header.startIndexPtr).toBe(DATA_START + payloadBytes)
  })

  it('段数 = (endIndexPtr - startIndexPtr) / 14 + 1（末段起点而非终点）', () => {
    expect(readXdbHeader(XDB).segmentCount).toBe(ROWS.length)
  })

  it('接受 Uint8Array，与 ArrayBuffer 等价', () => {
    expect(readXdbHeader(new Uint8Array(XDB))).toEqual(readXdbHeader(XDB))
  })

  it.each([
    ['数据过小', () => new ArrayBuffer(64), /过小/],
    ['非 buffer 类型', () => 'not a buffer', /ArrayBuffer/],
  ])('%s', (_name, make, expected) => {
    expect(errMsg(() => readXdbHeader(make()))).toMatch(expected)
  })

  it('索引指针颠倒时报错', () => {
    const corrupted = XDB.slice(0)
    new DataView(corrupted).setUint32(12, 0, true)
    expect(errMsg(() => readXdbHeader(corrupted))).toMatch(/指针颠倒|不符/)
  })

  it('文件被截断（endIndexPtr + 14 != 文件长度）时报错', () => {
    const truncated = XDB.slice(0, XDB.byteLength - SEGMENT_SIZE)
    expect(errMsg(() => readXdbHeader(truncated))).toMatch(/截断/)
  })
})

describe('createXdbSearcher 二分查找', () => {
  const searcher = createXdbSearcher(XDB)

  it('命中首段', () => {
    const r = searcher.search('0.0.0.1')
    expect(r.found).toBe(true)
    expect(r.isReserved).toBe(true)
    expect(r.segment).toEqual({ start: '0.0.0.0', end: '0.0.255.255' })
  })

  it('命中中间段并拆出各字段', () => {
    const r = searcher.search('8.8.8.8')
    expect(r.found).toBe(true)
    expect(r.country).toBe('United States')
    expect(r.province).toBe('California')
    expect(r.city).toBe('')
    expect(r.isp).toBe('Google LLC')
    expect(r.isoCode).toBe('US')
    expect(r.segment).toEqual({ start: '8.8.8.0', end: '8.8.8.255' })
  })

  // 回归哨兵：段数若漏掉 +1，末段不可达
  it('命中末段（段数漏算 +1 时此例必失败）', () => {
    const r = searcher.search('255.254.255.255')
    expect(r.found).toBe(true)
    expect(r.segment).toEqual({ start: '255.254.0.0', end: '255.254.255.255' })
  })

  it.each(['255.254.0.0', '255.254.100.1'])('末段边界 %s 命中', (ip) => {
    expect(searcher.search(ip).found).toBe(true)
  })

  it.each(['2.0.0.1', '9.0.0.1', '255.255.255.255'])('未覆盖区间 %s 如实报告未收录', (ip) => {
    const r = searcher.search(ip)
    expect(r.found).toBe(false)
    expect(r.ip).toBe(ip)
  })

  it('接受带前缀的写法并忽略前缀', () => {
    expect(searcher.search('8.8.8.8/32').country).toBe('United States')
    expect(searcher.search('8.8.8.0/24').found).toBe(true)
  })

  it.each([
    ['', /不能为空/],
    ['   ', /不能为空/],
    ['2001:db8::1', /IPv6/],
    ['1.2.3', /4 段/],
    ['1.2.3.999', /越界/],
    ['abc', /4 段/],
  ])('非法输入「%s」', (input, expected) => {
    expect(errMsg(() => searcher.search(input))).toMatch(expected)
  })

  it('暴露与 header 一致的元信息', () => {
    expect(searcher.segmentCount).toBe(ROWS.length)
    expect(searcher.startIndexPtr).toBe(readXdbHeader(XDB).startIndexPtr)
  })
})

describe('parseRegionText', () => {
  it('五段式字段拆分，0 视为空', () => {
    expect(parseRegionText('中国|江苏省|南京市|0|CN')).toEqual({
      country: '中国',
      province: '江苏省',
      city: '南京市',
      isp: '',
      isoCode: 'CN',
      isReserved: false,
    })
  })

  it('Reserved 段被识别为保留地址', () => {
    expect(parseRegionText('Reserved|Reserved|Reserved|0|0').isReserved).toBe(true)
  })

  it('字段缺失时补空串而非 undefined', () => {
    expect(parseRegionText('中国')).toMatchObject({
      country: '中国',
      province: '',
      city: '',
      isp: '',
      isoCode: '',
    })
  })

  it('空输入不抛错', () => {
    expect(parseRegionText(undefined).country).toBe('')
  })
})

describe('describeRegion', () => {
  it('拼接非空字段', () => {
    expect(describeRegion({ found: true, ...parseRegionText('中国|江苏省|南京市|0|CN') })).toBe(
      '中国 江苏省 南京市'
    )
    expect(
      describeRegion({
        found: true,
        ...parseRegionText('United States|California|0|Google LLC|US'),
      })
    ).toBe('United States California Google LLC')
  })

  it('保留地址给专门文案', () => {
    const entry = { found: true, ...parseRegionText('Reserved|Reserved|Reserved|0|0') }
    expect(describeRegion(entry)).toBe('保留地址（未分配为公网）')
  })

  it('未收录', () => {
    expect(describeRegion({ found: false })).toBe('未收录')
    expect(describeRegion(null)).toBe('未收录')
  })
})

// ---------- 与真实数据文件的契约 ----------
// 期望值全部由 Python 脚本直接读 xdb 二进制取得，不是推断值。
const DB_PATH = new URL('../../public/ip2region/ip2region_v4.xdb', import.meta.url)

describe.skipIf(!existsSync(DB_PATH))('真实 xdb 数据契约', () => {
  const buffer = readFileSync(DB_PATH)
  const searcher = createXdbSearcher(buffer)

  it('段数与 payload 窗口符合实测值', () => {
    expect(buffer.byteLength).toBe(11122036)
    expect(searcher.startIndexPtr).toBe(3366666)
    expect(searcher.endIndexPtr).toBe(11122022)
    expect(searcher.segmentCount).toBe(553955)
  })

  it.each([
    ['114.114.114.114', '中国', '江苏省', '南京市', '', 'CN'],
    ['223.5.5.5', '中国', '浙江省', '杭州市', '阿里', 'CN'],
    ['8.8.8.8', 'United States', 'California', '', 'Google LLC', 'US'],
    ['1.1.1.1', 'Australia', 'Queensland', 'Brisbane', '', 'AU'],
  ])('%s → %s|%s|%s|%s|%s', (ip, country, province, city, isp, isoCode) => {
    expect(searcher.search(ip)).toMatchObject({
      found: true,
      country,
      province,
      city,
      isp,
      isoCode,
    })
  })

  it('私网地址落在保留段', () => {
    const r = searcher.search('192.168.1.1')
    expect(r.found).toBe(true)
    expect(r.isReserved).toBe(true)
    expect(r.segment).toEqual({ start: '192.168.0.0', end: '192.168.255.255' })
  })

  it('官方库对全部 IPv4 地址空间连续覆盖，末段为 255.255.0.0/16', () => {
    expect(searcher.search('255.254.255.255').segment).toEqual({
      start: '255.254.0.0',
      end: '255.254.255.255',
    })
    const last = searcher.search('255.255.255.255')
    expect(last.found).toBe(true)
    expect(last.segment).toEqual({ start: '255.255.0.0', end: '255.255.255.255' })
    expect(last.isReserved).toBe(true)
  })

  it('首段为 0.0.0.0/16 保留段', () => {
    expect(searcher.search('0.0.0.0').segment).toEqual({ start: '0.0.0.0', end: '0.0.255.255' })
  })
})
