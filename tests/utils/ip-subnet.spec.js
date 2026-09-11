import { describe, expect, it } from 'vitest'
import {
  computeSubnet,
  describeCidr,
  ipClass,
  ipKind,
  ipToString,
  parseCidr,
  parseIpv4,
  sameSubnet,
} from '@/common/utils/ip-subnet'

const errMsg = (fn) => {
  try {
    fn()
  } catch (e) {
    return e.message
  }
  return null
}

describe('parseIpv4 / ipToString', () => {
  it.each([
    ['0.0.0.0', 0x00000000],
    ['255.255.255.255', 0xffffffff],
    ['192.168.1.1', 0xc0a80101],
    ['10.0.0.1', 0x0a000001],
    ['127.0.0.1', 0x7f000001],
  ])('%s', (input, expected) => {
    expect(parseIpv4(input)).toBe(expected)
  })

  it('ipToString 与 parseIpv4 互逆', () => {
    const samples = [0, 1, 0xc0a80101, 0x7f000001, 0xffffffff]
    for (const n of samples) {
      expect(parseIpv4(ipToString(n))).toBe(n)
    }
  })

  it.each([
    ['', 'IP 不能为空'],
    ['1.2.3', 'IP 必须包含 4 段'],
    ['1.2.3.4.5', 'IP 必须包含 4 段'],
    ['1.2.3.256', '段值越界 0–255'],
    ['1.2.3.04', '不允许前导零'],
    ['-1.2.3.4', '不允许前导零'],
  ])('非法输入「%s」', (input, expected) => {
    expect(errMsg(() => parseIpv4(input))).toMatch(expected)
  })
})

describe('parseCidr', () => {
  it('带 /N', () => {
    expect(parseCidr('192.168.1.0/24')).toEqual({ ip: 0xc0a80100, prefix: 24 })
  })

  it('不带 /N 默认 /32', () => {
    expect(parseCidr('10.0.0.1')).toEqual({ ip: 0x0a000001, prefix: 32 })
  })

  it.each(['-1', '33', '1.5', 'abc'])('非法前缀「%s」', (p) => {
    expect(errMsg(() => parseCidr('10.0.0.0/' + p))).toMatch(/前缀长度/)
  })
})

describe('ipClass / ipKind', () => {
  it.each([
    ['10.0.0.1', 'A'],
    ['126.255.255.255', 'A'],
    ['128.0.0.1', 'B'],
    ['191.255.255.255', 'B'],
    ['192.168.1.1', 'C'],
    ['223.255.255.255', 'C'],
    ['224.0.0.1', 'D (组播)'],
    ['240.0.0.1', 'E (实验)'],
  ])('%s → %s', (ip, cls) => {
    expect(ipClass(parseIpv4(ip))).toBe(cls)
  })

  it.each([
    ['10.0.0.1', '私有 (RFC 1918)'],
    ['172.16.0.1', '私有 (RFC 1918)'],
    ['172.31.255.254', '私有 (RFC 1918)'],
    ['172.32.0.1', '公有'],
    ['172.15.255.255', '公有'],
    ['192.168.1.1', '私有 (RFC 1918)'],
    ['127.0.0.1', '回环 (loopback)'],
    ['169.254.0.1', '链路本地 (link-local)'],
    ['224.0.0.1', '组播'],
    ['255.255.255.255', '受限广播 (limited broadcast)'],
    ['0.0.0.0', '未指定地址 (this network)'],
    ['8.8.8.8', '公有'],
  ])('%s → %s', (ip, kind) => {
    expect(ipKind(parseIpv4(ip))).toBe(kind)
  })
})

describe('computeSubnet 标准用例', () => {
  it('192.168.1.0/24', () => {
    const r = computeSubnet(parseCidr('192.168.1.0/24'))
    expect(r.network).toBe('192.168.1.0')
    expect(r.broadcast).toBe('192.168.1.255')
    expect(r.firstHost).toBe('192.168.1.1')
    expect(r.lastHost).toBe('192.168.1.254')
    expect(r.hostCount).toBe(254)
    expect(r.maskDotted).toBe('255.255.255.0')
    expect(r.mask).toBe('/24')
  })

  it('10.0.0.0/8', () => {
    const r = computeSubnet(parseCidr('10.0.0.0/8'))
    expect(r.network).toBe('10.0.0.0')
    expect(r.broadcast).toBe('10.255.255.255')
    expect(r.hostCount).toBe(16777214)
    expect(r.maskDotted).toBe('255.0.0.0')
  })

  it('172.16.0.0/12', () => {
    const r = computeSubnet(parseCidr('172.16.0.0/12'))
    expect(r.network).toBe('172.16.0.0')
    expect(r.broadcast).toBe('172.31.255.255')
  })

  it('192.168.1.100/24 主机地址：网络与广播按位计算', () => {
    const r = computeSubnet(parseCidr('192.168.1.100/24'))
    expect(r.input).toBe('192.168.1.100')
    expect(r.network).toBe('192.168.1.0')
    expect(r.broadcast).toBe('192.168.1.255')
  })
})

describe('边界前缀（RFC 3021 等）', () => {
  it('/32 单一主机', () => {
    const r = computeSubnet(parseCidr('10.0.0.5/32'))
    expect(r.network).toBe('10.0.0.5')
    expect(r.broadcast).toBe('10.0.0.5')
    expect(r.firstHost).toBe('10.0.0.5')
    expect(r.lastHost).toBe('10.0.0.5')
    expect(r.hostCount).toBe(1)
  })

  it('/31 点对点（RFC 3021 两个地址都是主机）', () => {
    const r = computeSubnet(parseCidr('10.0.0.0/31'))
    expect(r.network).toBe('10.0.0.0')
    expect(r.broadcast).toBe('10.0.0.1')
    expect(r.firstHost).toBe('10.0.0.0')
    expect(r.lastHost).toBe('10.0.0.1')
    expect(r.hostCount).toBe(2)
  })

  it('/30 经典点对点链路（2 个可用主机）', () => {
    const r = computeSubnet(parseCidr('192.168.1.0/30'))
    expect(r.network).toBe('192.168.1.0')
    expect(r.broadcast).toBe('192.168.1.3')
    expect(r.firstHost).toBe('192.168.1.1')
    expect(r.lastHost).toBe('192.168.1.2')
    expect(r.hostCount).toBe(2)
  })

  it('/0 全网', () => {
    const r = computeSubnet(parseCidr('1.2.3.4/0'))
    expect(r.network).toBe('0.0.0.0')
    expect(r.broadcast).toBe('255.255.255.255')
    expect(r.hostCount).toBe(4294967294)
    expect(r.maskDotted).toBe('0.0.0.0')
  })
})

describe('sameSubnet', () => {
  it('同 /24 同一网段', () => {
    expect(sameSubnet(parseCidr('192.168.1.10/24'), parseCidr('192.168.1.200/24'))).toBe(true)
  })

  it('同 /24 不同网段', () => {
    expect(sameSubnet(parseCidr('192.168.1.10/24'), parseCidr('192.168.2.10/24'))).toBe(false)
  })

  it('不同前缀时取较精确的（/30 定义子网，/24 网络 .0 与 /30 .4 不同）', () => {
    // /30 比 /24 更精确：10.0.0.0/24 net = 10.0.0.0, 10.0.0.5/30 net = 10.0.0.4
    expect(sameSubnet(parseCidr('10.0.0.0/24'), parseCidr('10.0.0.5/30'))).toBe(false)
    // /24 比 /16 精确：两者都落在 10.0.0.0/24 内
    expect(sameSubnet(parseCidr('10.0.0.0/16'), parseCidr('10.0.0.5/24'))).toBe(true)
  })
})

describe('describeCidr 高层便捷函数', () => {
  it('一步给出完整信息', () => {
    const r = describeCidr('192.168.1.0/24')
    expect(r.network).toBe('192.168.1.0')
    expect(r.kind).toBe('私有 (RFC 1918)')
    expect(r.ipClass).toBe('C')
  })
})
