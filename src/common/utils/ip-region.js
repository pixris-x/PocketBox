// ============================================================
// ip2region xdb 读取与离线 IP 归属地查询（纯函数，零网络请求）
// 数据来源：ip2region v4 离线库（Apache-2.0 / MIT 双许可），文件见 public/ip2region/
//
// 二进制布局（已对官方 data/ip2region_v4.xdb 全量实测验证）：
//   [0, 256)                         header
//     u32 LE @0    版本号（0x00010003）
//     u32 LE @4    生成时间戳（秒）
//     u32 LE @8    startIndexPtr   索引区起点
//     u32 LE @12   endIndexPtr     末段起点（末段结束即文件末尾）
//   [256, 524544)                    vector index（512KiB，本实现直接二分段索引，跳过不用）
//   [524544, startIndexPtr)          data payload（region 字符串，相同内容共享一份）
//   [startIndexPtr, 文件末尾)        段索引，每段 14 字节小端：sip(4) eip(4) dataLen(2) dataPtr(4)
//
// 注意 endIndexPtr 是「末段起点」而非索引区终点，所以
//   段数 = (endIndexPtr - startIndexPtr) / 14 + 1
// 少了这个 +1 会丢掉最后一段；同时 endIndexPtr + 14 必须正好等于文件长度，
// 用它可以做零成本的完整性校验。段按 sip 升序且首尾相接，实测 553955 段从 0.0.0.0 连续覆盖到
// 255.255.255.255（无空洞、无重叠），因此整个索引区直接二分即可，不需要官方那套 vector index。
// ============================================================
import { ipToString, parseCidr } from './ip-subnet'

const HEADER_SIZE = 256
const SEGMENT_SIZE = 14
const VECTOR_INDEX_SIZE = 512 * 1024
const DATA_START = HEADER_SIZE + VECTOR_INDEX_SIZE

/** region 串里用 '0' 表示该字段为空 */
const EMPTY_FIELD = '0'

const UTF8_DECODER = new TextDecoder('utf-8')

function toDataView(input) {
  if (input instanceof ArrayBuffer) return new DataView(input)
  if (ArrayBuffer.isView(input)) {
    return new DataView(input.buffer, input.byteOffset, input.byteLength)
  }
  throw new Error('xdb 数据必须是 ArrayBuffer 或 TypedArray')
}

/**
 * 读取 xdb 头部，顺带校验文件完整性
 * @returns {{version:number, createdAt:number, startIndexPtr:number, endIndexPtr:number, segmentCount:number}}
 */
export function readXdbHeader(input) {
  const view = toDataView(input)
  if (view.byteLength < DATA_START + SEGMENT_SIZE) {
    throw new Error('xdb 数据过小，不是有效的 ip2region 数据库')
  }

  const version = view.getUint32(0, true)
  const createdAt = view.getUint32(4, true)
  const startIndexPtr = view.getUint32(8, true)
  const endIndexPtr = view.getUint32(12, true)

  if (endIndexPtr < startIndexPtr) {
    throw new Error('xdb 索引指针颠倒，文件已损坏')
  }
  // 末段结束位置必须正好压在文件末尾，否则说明文件被截断或不是本格式
  if (endIndexPtr + SEGMENT_SIZE !== view.byteLength) {
    throw new Error('xdb 索引区与文件长度不符，文件可能被截断')
  }

  return {
    version,
    createdAt,
    startIndexPtr,
    endIndexPtr,
    segmentCount: (endIndexPtr - startIndexPtr) / SEGMENT_SIZE + 1,
  }
}

/**
 * 创建查询器。buffer 为整个 xdb 文件内容（ArrayBuffer / Uint8Array）
 */
export function createXdbSearcher(input) {
  const view = toDataView(input)
  const header = readXdbHeader(view)
  const { startIndexPtr, segmentCount } = header

  function readSegment(index) {
    const offset = startIndexPtr + index * SEGMENT_SIZE
    return {
      start: view.getUint32(offset, true),
      end: view.getUint32(offset + 4, true),
      dataLength: view.getUint16(offset + 8, true),
      dataPtr: view.getUint32(offset + 10, true),
    }
  }

  function readRegionText(segment) {
    const from = segment.dataPtr
    const to = from + segment.dataLength
    // dataPtr 理论上都落在 payload 窗口内，越界说明数据文件异常，宁可报错也不要读出乱码
    if (from < DATA_START || to > startIndexPtr) {
      throw new Error('xdb 数据段指针越界，文件已损坏')
    }
    return UTF8_DECODER.decode(new Uint8Array(view.buffer, view.byteOffset + from, to - from))
  }

  /**
   * 查一个 IPv4 地址的归属地
   * @param {string} ip 支持纯 IP，也接受带 /prefix 的写法（前缀会被忽略）
   * @returns {{ip:string, found:boolean, country?:string, province?:string, city?:string,
   *   isp?:string, isoCode?:string, isReserved?:boolean, raw?:string,
   *   segment?:{start:string, end:string}}}
   */
  function search(ip) {
    const text = String(ip ?? '').trim()
    if (!text) throw new Error('IP 不能为空')
    if (text.includes(':')) {
      throw new Error('离线库为 IPv4 库，IPv6 地址暂不支持查询')
    }

    const target = parseCidr(text).ip >>> 0

    let lo = 0
    let hi = segmentCount - 1
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      const segment = readSegment(mid)
      if (target < segment.start) hi = mid - 1
      else if (target > segment.end) lo = mid + 1
      else {
        const raw = readRegionText(segment)
        return {
          ip: text,
          found: true,
          ...parseRegionText(raw),
          raw,
          segment: { start: ipToString(segment.start), end: ipToString(segment.end) },
        }
      }
    }

    // 官方 v4 库对 0.0.0.0 ~ 255.255.255.255 连续全覆盖，理论上二分必然命中；
    // 保留此分支是为了自造/裁剪过的库，以及索引偶发异常时不至于编造归属地
    return { ip: text, found: false }
  }

  return { ...header, search }
}

/** 拆分 region 串「国家|省份|城市|ISP|ISO码」，'0' 视为空字段 */
export function parseRegionText(text) {
  const parts = String(text ?? '').split('|')
  const pick = (index) => {
    const value = parts[index] ?? ''
    return value === EMPTY_FIELD ? '' : value
  }

  const country = pick(0)
  return {
    country,
    province: pick(1),
    city: pick(2),
    isp: pick(3),
    isoCode: pick(4),
    isReserved: country.toLowerCase() === 'reserved',
  }
}

/** 归属地的人类可读单行描述 */
export function describeRegion(entry) {
  if (!entry || !entry.found) return '未收录'
  if (entry.isReserved) return '保留地址（未分配为公网）'
  return [entry.country, entry.province, entry.city, entry.isp].filter(Boolean).join(' ')
}
