// ============================================================
// IPv4 CIDR 子网工具（纯位运算，零依赖）
// 重要：JS 位运算以 32 位有符号数工作，统一用 >>> 0 转无符号 32 位。
// ============================================================

const PRIVATE_RANGES = [
  { base: 0x0a000000, mask: 0xff000000 }, // 10.0.0.0/8
  { base: 0xac100000, mask: 0xfff00000 }, // 172.16.0.0/12
  { base: 0xc0a80000, mask: 0xffff0000 }, // 192.168.0.0/16
  { base: 0x7f000000, mask: 0xff000000 }, // 127.0.0.0/8 (loopback)
  { base: 0xa9fe0000, mask: 0xffff0000 }, // 169.254.0.0/16 (link-local)
]

/** 字符串 IPv4 → 无符号 32 位整数；非法格式抛可读错误 */
export function parseIpv4(input) {
  const text = String(input ?? '').trim()
  if (!text) throw new Error('IP 不能为空')
  const parts = text.split('.')
  if (parts.length !== 4) throw new Error('IP 必须包含 4 段（点分十进制）')
  let n = 0
  for (const p of parts) {
    if (!/^(0|[1-9]\d*)$/.test(p)) {
      throw new Error(`每段必须是非负整数（不允许前导零）：「${p}」`)
    }
    const v = Number(p)
    if (v > 255) throw new Error(`IP 段值越界 0–255：${v}`)
    n = n * 256 + v
  }
  return n >>> 0
}

/** 无符号 32 位整数 → 点分十进制字符串 */
export function ipToString(num) {
  const n = num >>> 0
  return `${(n >>> 24) & 0xff}.${(n >>> 16) & 0xff}.${(n >>> 8) & 0xff}.${n & 0xff}`
}

/** 解析 CIDR（支持 "192.168.1.0/24" 或纯 IP，默认 /32） */
export function parseCidr(input) {
  const text = String(input ?? '').trim()
  if (!text) throw new Error('输入不能为空')
  const slash = text.indexOf('/')
  let ipPart, prefix
  if (slash === -1) {
    ipPart = text
    prefix = 32
  } else {
    ipPart = text.slice(0, slash)
    prefix = Number(text.slice(slash + 1).trim())
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
      throw new Error('前缀长度必须是 0–32 的整数')
    }
  }
  return { ip: parseIpv4(ipPart), prefix }
}

/** 32 位数字 → 分类（A/B/C/D/E） */
export function ipClass(num) {
  const first = (num >>> 24) & 0xff
  if (first <= 126) return 'A'
  if (first <= 191) return 'B'
  if (first <= 223) return 'C'
  if (first <= 239) return 'D (组播)'
  return 'E (实验)'
}

function isInRange(num, base, mask) {
  return (num & mask) >>> 0 === base >>> 0
}

/** 是否私有 / 特殊地址 */
export function ipKind(num) {
  const n = num >>> 0
  for (const { base, mask } of PRIVATE_RANGES) {
    if (isInRange(n, base, mask)) {
      if (base === 0x7f000000) return '回环 (loopback)'
      if (base === 0xa9fe0000) return '链路本地 (link-local)'
      return '私有 (RFC 1918)'
    }
  }
  if (((n >>> 28) & 0xf) === 0xe) return '组播'
  if (n === 0xffffffff) return '受限广播 (limited broadcast)'
  if (n === 0) return '未指定地址 (this network)'
  return '公有'
}

/**
 * 计算子网信息
 * @param {{ip: number, prefix: number}} cidr
 * @returns {{
 *   input: string, network: string, broadcast: string,
 *   firstHost: string, lastHost: string, hostCount: number,
 *   mask: string, maskDotted: string, prefix: number,
 *   ipClass: string, kind: string
 * }}
 */
export function computeSubnet({ ip, prefix }) {
  const ipNum = ip >>> 0
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  const network = (ipNum & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0
  // /32：只有 1 个地址
  // /31：RFC 3021 点对点链路，两个地址都是主机
  // 其余：首末各保留一个网关地址
  let firstHost, lastHost, hostCount
  if (prefix === 32) {
    firstHost = ipToString(network)
    lastHost = ipToString(network)
    hostCount = 1
  } else if (prefix === 31) {
    firstHost = ipToString(network)
    lastHost = ipToString(broadcast)
    hostCount = 2
  } else {
    firstHost = ipToString((network + 1) >>> 0)
    lastHost = ipToString((broadcast - 1) >>> 0)
    hostCount = Math.max(0, (broadcast - network - 1) >>> 0)
  }
  return {
    input: ipToString(ipNum),
    network: ipToString(network),
    broadcast: ipToString(broadcast),
    firstHost,
    lastHost,
    hostCount,
    mask: `/${prefix}`,
    maskDotted: ipToString(mask),
    prefix,
    ipClass: ipClass(ipNum),
    kind: ipKind(ipNum),
  }
}

/** 两个 CIDR 是否在同一子网（按各自的 prefix 比较 network 地址） */
export function sameSubnet(cidr1, cidr2) {
  const a = computeSubnet(cidr1)
  const b = computeSubnet(cidr2)
  // 用两者中较长的前缀来比较（更精确的划分必须落在对方的网络内）
  const commonPrefix = Math.max(a.prefix, b.prefix)
  const aNet = (parseIpv4(a.network) & ((0xffffffff << (32 - commonPrefix)) >>> 0)) >>> 0
  const bNet = (parseIpv4(b.network) & ((0xffffffff << (32 - commonPrefix)) >>> 0)) >>> 0
  return aNet === bNet
}

/** 高层便捷函数：CIDR 字符串 → 完整子网信息 */
export function describeCidr(input) {
  return computeSubnet(parseCidr(input))
}
