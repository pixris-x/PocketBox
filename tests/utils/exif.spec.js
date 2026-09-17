import { describe, it, expect } from 'vitest'
import { parseExif } from '@/common/utils/exif'

// ============================================================
// fixture 合成器：按 EXIF/TIFF 规范手工拼字节，期望值由构造得出
//   布局：TIFF 头(8B) + 各 IFD（2 + 12n + 4）+ 大值堆（>4B 的值放这里）
// ============================================================
const TYPE_SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }

function makeWriter(little) {
  const bytes = []
  const w = {
    u16(v) {
      if (little) bytes.push(v & 255, (v >> 8) & 255)
      else bytes.push((v >> 8) & 255, v & 255)
    },
    u32(v) {
      if (little) {
        bytes.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255)
      } else {
        bytes.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255)
      }
    },
    raw(arr) {
      bytes.push(...arr)
    },
    get length() {
      return bytes.length
    },
    build() {
      return new Uint8Array(bytes)
    },
  }
  return w
}

function asciiBytes(text) {
  const out = []
  for (const ch of text) out.push(ch.charCodeAt(0))
  return new Uint8Array(out)
}

function rationals(pairs, little) {
  const w = makeWriter(little)
  for (const [num, den] of pairs) (w.u32(num), w.u32(den))
  return w.build()
}

function shortBytes(value, little) {
  return little
    ? new Uint8Array([value & 255, (value >> 8) & 255])
    : new Uint8Array([(value >> 8) & 255, value & 255])
}

/**
 * groups: [{ entries: [{tag, type, count, data?, ifd?}] }]
 * entry.ifd 表示该条目是 LONG 指针，内联值指向第 ifd 个 IFD 的偏移
 */
function buildTiff(little, groups) {
  const ifdSizes = groups.map((g) => 2 + g.entries.length * 12 + 4)
  const ifdOffsets = []
  let offset = 8
  for (const size of ifdSizes) {
    ifdOffsets.push(offset)
    offset += size
  }
  let heapOffset = offset
  const placements = groups.map((g) =>
    g.entries.map((entry) => {
      const size = TYPE_SIZES[entry.type] * entry.count
      if (size <= 4) return { inline: true }
      const aligned = heapOffset % 2 === 1 ? heapOffset + 1 : heapOffset
      heapOffset = aligned + size
      return { inline: false, offset: aligned }
    })
  )

  const w = makeWriter(little)
  w.raw(little ? [0x49, 0x49] : [0x4d, 0x4d])
  w.u16(42)
  w.u32(ifdOffsets[0])
  groups.forEach((group, gi) => {
    w.u16(group.entries.length)
    group.entries.forEach((entry, ei) => {
      const place = placements[gi][ei]
      w.u16(entry.tag)
      w.u16(entry.type)
      w.u32(entry.count)
      if (place.inline) {
        if (entry.ifd != null) {
          const p = makeWriter(little)
          p.u32(ifdOffsets[entry.ifd])
          w.raw(p.build())
        } else {
          w.raw(Array.from(entry.data || []))
          const used = entry.data ? entry.data.length : 0
          for (let pad = used; pad < 4; pad++) w.raw([0])
        }
      } else {
        w.u32(place.offset)
      }
    })
    w.u32(0) // next IFD
  })
  // 堆区
  groups.forEach((group, gi) => {
    group.entries.forEach((entry, ei) => {
      const place = placements[gi][ei]
      if (place.inline) return
      while (w.length < place.offset) w.raw([0])
      w.raw(Array.from(entry.data))
    })
  })
  return w.build()
}

function wrapJpeg(tiff) {
  const payloadLength = 6 + tiff.length + 2 // "Exif\0\0" + tiff + 长度字段自身
  const w = makeWriter(false)
  w.raw([0xff, 0xd8])
  w.raw([0xff, 0xe1])
  w.u16(payloadLength)
  w.raw(asciiBytes('Exif'))
  w.raw([0, 0])
  w.raw(Array.from(tiff))
  w.raw([0xff, 0xda, 0x00, 0x02]) // SOS，扫描应在此停止
  return w.build()
}

function sampleGroups(little) {
  return [
    {
      entries: [
        { tag: 0x0110, type: 2, count: 6, data: asciiBytes('Canon\0') },
        { tag: 0x0112, type: 3, count: 1, data: shortBytes(6, little) },
        { tag: 0x0131, type: 2, count: 3, data: asciiBytes('ab\0') },
        { tag: 0x8769, type: 4, count: 1, ifd: 1 },
        { tag: 0x8825, type: 4, count: 1, ifd: 2 },
      ],
    },
    {
      entries: [
        { tag: 0x829a, type: 5, count: 1, data: rationals([[1, 125]], little) },
        { tag: 0x8827, type: 3, count: 1, data: shortBytes(200, little) },
        {
          tag: 0x9003,
          type: 2,
          count: 20,
          data: asciiBytes('2026:09:17 10:00:00\0'),
        },
        {
          tag: 0x9286,
          type: 7,
          count: 13,
          data: asciiBytes('ASCII\0\0\0hello'),
        },
      ],
    },
    {
      entries: [
        { tag: 0x0001, type: 2, count: 2, data: asciiBytes('N\0') },
        {
          tag: 0x0002,
          type: 5,
          count: 3,
          data: rationals(
            [
              [39, 1],
              [54, 1],
              [3000, 100],
            ],
            little
          ),
        },
        { tag: 0x0003, type: 2, count: 2, data: asciiBytes('E\0') },
        {
          tag: 0x0004,
          type: 5,
          count: 3,
          data: rationals(
            [
              [116, 1],
              [23, 1],
              [4000, 100],
            ],
            little
          ),
        },
        { tag: 0x0006, type: 5, count: 1, data: rationals([[5000, 100]], little) },
      ],
    },
  ]
}

describe('parseExif', () => {
  it('解析大端（MM）完整 EXIF：字符串 / 内联值 / 指针 IFD / GPS 换算', () => {
    const tiff = buildTiff(false, sampleGroups(false))
    const result = parseExif(tiff)

    expect(result.found).toBe(true)
    expect(result.byteOrder).toBe('MM')
    expect(result.model).toBe('Canon')
    expect(result.orientation).toBe(6)
    expect(result.software).toBe('ab')
    expect(result.exposureTime).toBeCloseTo(1 / 125, 12)
    expect(result.iso).toBe(200)
    expect(result.dateTimeOriginal).toBe('2026:09:17 10:00:00')
    expect(result.userComment).toBe('hello')
    expect(result.hasGps).toBe(true)
    expect(result.gps.latitude).toBeCloseTo(39 + 54 / 60 + 30 / 3600, 9)
    expect(result.gps.longitude).toBeCloseTo(116 + 23 / 60 + 40 / 3600, 9)
    expect(result.gps.latitudeRef).toBe('N')
    expect(result.gps.altitude).toBe(50)
  })

  it('解析小端（II）得到同样的结果', () => {
    const tiff = buildTiff(true, sampleGroups(true))
    const result = parseExif(tiff)

    expect(result.found).toBe(true)
    expect(result.byteOrder).toBe('II')
    expect(result.model).toBe('Canon')
    expect(result.exposureTime).toBeCloseTo(1 / 125, 12)
    expect(result.gps.latitude).toBeCloseTo(39 + 54 / 60 + 30 / 3600, 9)
  })

  it('从 JPEG APP1 段中定位 EXIF，结果与直接解析 TIFF 一致', () => {
    const tiff = buildTiff(false, sampleGroups(false))
    const jpeg = wrapJpeg(tiff)
    expect(parseExif(jpeg)).toEqual(parseExif(tiff))
  })

  it('没有 EXIF 的 JPEG（只有 APP0 + SOS）返回 found:false', () => {
    const w = makeWriter(false)
    w.raw([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x02, 0xff, 0xda, 0x00, 0x02])
    expect(parseExif(w.build())).toMatchObject({ found: false })
  })

  it('非 JPEG 输入（PNG 头、随机字节）返回 found:false', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(parseExif(png)).toMatchObject({ found: false })
    expect(parseExif(new Uint8Array(64).fill(0x41))).toMatchObject({ found: false })
  })

  it('损坏与截断输入不抛异常，一律 found:false', () => {
    const valid = buildTiff(false, sampleGroups(false))
    expect(parseExif(valid.slice(0, 10))).toMatchObject({ found: false }) // IFD 区被截断
    expect(parseExif(new Uint8Array(0))).toMatchObject({ found: false })
    expect(parseExif(null)).toMatchObject({ found: false })
    expect(parseExif('not bytes')).toMatchObject({ found: false })
    expect(parseExif(new ArrayBuffer(4))).toMatchObject({ found: false })
  })

  it('TIFF 魔数错误返回 found:false', () => {
    const tiff = buildTiff(false, sampleGroups(false))
    const broken = tiff.slice()
    broken[2] = 1 // 魔数 0x002A → 0x012A，大小端都不再是 42
    expect(parseExif(broken)).toMatchObject({ found: false })
  })

  it('值偏移越界的条目被跳过，其余字段照常解析', () => {
    const groups = [
      {
        entries: [
          { tag: 0x0110, type: 2, count: 6, data: asciiBytes('Canon\0') },
          { tag: 0x010f, type: 2, count: 6, data: asciiBytes('Sony\0\0') },
        ],
      },
    ]
    const tiff = buildTiff(false, groups)
    // 把第一个条目（Model）的值偏移指到 TIFF 之外
    // IFD0 起始 8，条目区 8+2 起；第 1 个条目 base=10，值偏移在 base+8=18
    const broken = tiff.slice()
    broken[18] = 0xff
    broken[19] = 0xff
    broken[20] = 0xff
    broken[21] = 0xff
    const result = parseExif(broken)
    expect(result.found).toBe(true)
    expect(result.model).toBeUndefined()
    expect(result.make).toBe('Sony')
  })

  it('RATIONAL 分母为 0 时该值为 null', () => {
    const groups = [
      {
        entries: [
          {
            tag: 0x8769,
            type: 4,
            count: 1,
            ifd: 1,
          },
        ],
      },
      {
        entries: [{ tag: 0x829a, type: 5, count: 1, data: rationals([[1, 0]], false) }],
      },
    ]
    const result = parseExif(buildTiff(false, groups))
    expect(result.found).toBe(true)
    expect(result.exposureTime).toBeNull()
  })

  it('GPS 南纬 / 西经换算为负数', () => {
    const groups = [
      { entries: [{ tag: 0x8825, type: 4, count: 1, ifd: 1 }] },
      {
        entries: [
          { tag: 0x0001, type: 2, count: 2, data: asciiBytes('S\0') },
          {
            tag: 0x0002,
            type: 5,
            count: 3,
            data: rationals(
              [
                [39, 1],
                [0, 1],
                [0, 1],
              ],
              false
            ),
          },
          { tag: 0x0003, type: 2, count: 2, data: asciiBytes('W\0') },
          {
            tag: 0x0004,
            type: 5,
            count: 3,
            data: rationals(
              [
                [116, 1],
                [0, 1],
                [0, 1],
              ],
              false
            ),
          },
        ],
      },
    ]
    const result = parseExif(buildTiff(false, groups))
    expect(result.gps.latitude).toBe(-39)
    expect(result.gps.longitude).toBe(-116)
    expect(result.hasGps).toBe(true)
  })

  it('GPS 缺少度分秒数据时经纬度为 null，不误报 hasGps', () => {
    const groups = [
      { entries: [{ tag: 0x8825, type: 4, count: 1, ifd: 1 }] },
      {
        entries: [{ tag: 0x0001, type: 2, count: 2, data: asciiBytes('N\0') }],
      },
    ]
    const result = parseExif(buildTiff(false, groups))
    expect(result.found).toBe(true)
    expect(result.gps.latitude).toBeNull()
    expect(result.gps.longitude).toBeNull()
    expect(result.hasGps).toBe(false)
  })

  it('ASCII 在第一个 \0 处截断', () => {
    const groups = [
      {
        entries: [
          // 声明 6 字节但堆里是 "Ca\0son\0" → 取 "Ca"
          { tag: 0x0110, type: 2, count: 7, data: asciiBytes('Ca\0son\0') },
        ],
      },
    ]
    const result = parseExif(buildTiff(false, groups))
    expect(result.model).toBe('Ca')
  })
})
