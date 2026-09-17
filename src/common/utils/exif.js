// ============================================================
// EXIF 元数据解析纯函数（无依赖、无 DOM、全本地）
// 支持范围：
//   - JPEG APP1 段内的 TIFF 结构（主流手机/相机的照片都是它）
//   - 也接受裸 TIFF 字节（II*/MM* 开头），便于直接解析与测试
// 解析层级：IFD0 →（0x8769 指针）Exif IFD、（0x8825 指针）GPS IFD
// 产出结构化字段；任何损坏/截断输入一律返回 found:false，绝不抛异常。
// ============================================================

const TYPE_SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }

const IFD0_TAGS = {
  0x010f: 'make',
  0x0110: 'model',
  0x0112: 'orientation',
  0x0131: 'software',
  0x0132: 'dateTime',
  0x013b: 'artist',
  0x8298: 'copyright',
}

const EXIF_TAGS = {
  0x829a: 'exposureTime',
  0x829d: 'fNumber',
  0x8827: 'iso',
  0x9003: 'dateTimeOriginal',
  0x9004: 'dateTimeDigitized',
  0x920a: 'focalLength',
  0x9209: 'flash',
  0xa002: 'pixelWidth',
  0xa003: 'pixelHeight',
  0x9286: 'userComment',
}

const GPS_TAGS = {
  0x0001: 'latitudeRef',
  0x0002: 'latitudeDms',
  0x0003: 'longitudeRef',
  0x0004: 'longitudeDms',
  0x0006: 'altitude',
}

const EMPTY_RESULT = Object.freeze({
  found: false,
  byteOrder: null,
  hasGps: false,
  gps: null,
})

/** 解析入口：ArrayBuffer / TypedArray / DataView 均可；非 JPEG 或无 EXIF 返回 found:false */
export function parseExif(input) {
  const bytes = toBytes(input)
  if (!bytes || bytes.length < 12) return { ...EMPTY_RESULT }

  let tiff = null
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    tiff = findJpegApp1(bytes)
  } else if (isTiffHeader(bytes)) {
    tiff = bytes
  }
  if (!tiff) return { ...EMPTY_RESULT }

  try {
    return decodeTiff(tiff)
  } catch {
    return { ...EMPTY_RESULT }
  }
}

function toBytes(input) {
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  }
  return null
}

function isTiffHeader(bytes) {
  const isII = bytes[0] === 0x49 && bytes[1] === 0x49
  const isMM = bytes[0] === 0x4d && bytes[1] === 0x4d
  return isII || isMM
}

/** 扫描 JPEG 段链找 APP1/Exif，返回其中的 TIFF 字节；找不到返回 null */
function findJpegApp1(bytes) {
  let i = 2
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return null
    while (i < bytes.length && bytes[i] === 0xff) i++ // 跳过填充 FF
    const marker = bytes[i]
    i++
    if (marker === 0xda) return null // SOS：图像数据开始，EXIF 不会在其后
    // 无长度字段的标记
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) continue
    if (i + 2 > bytes.length) return null
    const length = (bytes[i] << 8) | bytes[i + 1]
    if (length < 2) return null
    const dataStart = i + 2
    if (marker === 0xe1 && hasExifSignature(bytes, dataStart)) {
      return bytes.subarray(dataStart + 6, Math.min(dataStart + length - 2, bytes.length))
    }
    i = dataStart + length - 2
  }
  return null
}

function hasExifSignature(bytes, start) {
  const signature = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00] // "Exif\0\0"
  return signature.every((byte, index) => bytes[start + index] === byte)
}

function decodeTiff(tiff) {
  const little = tiff[0] === 0x49
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength)
  if (view.getUint16(2, little) !== 42) return { ...EMPTY_RESULT }

  const u16 = (offset) => view.getUint16(offset, little)
  const u32 = (offset) => view.getUint32(offset, little)

  /** 读取一个 IFD：[{tag, type, count, data}]，data 为实际值的字节 */
  function readIfd(offset) {
    if (offset < 8 || offset + 2 > tiff.length) return null
    const count = u16(offset)
    if (offset + 2 + count * 12 > tiff.length) return null
    const entries = []
    for (let i = 0; i < count; i++) {
      const base = offset + 2 + i * 12
      const tag = u16(base)
      const type = u16(base + 2)
      const valueCount = u32(base + 4)
      const size = (TYPE_SIZES[type] || 0) * valueCount
      if (size === 0 || size === undefined) continue // 未知类型：跳过
      let data
      if (size <= 4) {
        data = tiff.subarray(base + 8, base + 8 + size)
      } else {
        const valueOffset = u32(base + 8)
        if (valueOffset + size > tiff.length) continue // 值越界：跳过
        data = tiff.subarray(valueOffset, valueOffset + size)
      }
      entries.push({ tag, type, count: valueCount, data })
    }
    return entries
  }

  const ifd0 = readIfd(u32(4))
  if (!ifd0) return { ...EMPTY_RESULT }

  const result = { found: true, byteOrder: little ? 'II' : 'MM', hasGps: false, gps: null }
  let exifEntries = null
  let gpsEntries = null

  for (const entry of ifd0) {
    if (entry.tag === 0x8769 && entry.type === 4) {
      exifEntries = readIfd(readInlineU32(entry, little))
    } else if (entry.tag === 0x8825 && entry.type === 4) {
      gpsEntries = readIfd(readInlineU32(entry, little))
    } else {
      applyTag(result, entry, little)
    }
  }
  if (exifEntries) {
    for (const entry of exifEntries) applyTag(result, entry, little)
  }
  if (gpsEntries) {
    result.gps = decodeGps(gpsEntries, little)
    result.hasGps = Boolean(
      result.gps && (result.gps.latitude != null || result.gps.longitude != null)
    )
  }
  return result
}

/** 指针条目（LONG，内联 4 字节）按 TIFF 字节序读出偏移 */
function readInlineU32(entry, little) {
  const view = new DataView(entry.data.buffer, entry.data.byteOffset, 4)
  return view.getUint32(0, little)
}

/** 按条目类型把 data 解为值数组（RATIONAL 分母为 0 → null） */
function readNumbers(entry, little) {
  const view = new DataView(entry.data.buffer, entry.data.byteOffset, entry.data.byteLength)
  const out = []
  for (let i = 0; i < entry.count; i++) {
    switch (entry.type) {
      case 1:
        out.push(view.getUint8(i))
        break
      case 3:
        out.push(view.getUint16(i * 2, little))
        break
      case 4:
        out.push(view.getUint32(i * 4, little))
        break
      case 9:
        out.push(view.getInt32(i * 4, little))
        break
      case 5:
      case 10: {
        const base = i * 8
        const num = entry.type === 5 ? view.getUint32(base, little) : view.getInt32(base, little)
        const den =
          entry.type === 5 ? view.getUint32(base + 4, little) : view.getInt32(base + 4, little)
        out.push(den === 0 ? null : num / den)
        break
      }
      default:
        return out
    }
  }
  return out
}

function readAscii(entry) {
  let text = ''
  for (const byte of entry.data) {
    if (byte === 0) break
    text += String.fromCharCode(byte)
  }
  return text
}

/** UserComment（UNDEFINED）：前 8 字节是字符集标记（如 "ASCII\0\0\0"），跳过后按 ASCII 解 */
function readUndefinedText(entry) {
  if (entry.data.length > 8 && entry.data[0] === 0x41) {
    return readAscii({ data: entry.data.subarray(8) })
  }
  return readAscii(entry)
}

function applyTag(result, entry, little) {
  const key = IFD0_TAGS[entry.tag] || EXIF_TAGS[entry.tag]
  if (!key) return
  if (entry.type === 2) {
    result[key] = readAscii(entry)
    return
  }
  if (entry.type === 7) {
    result[key] = readUndefinedText(entry)
    return
  }
  const values = readNumbers(entry, little)
  result[key] = values.length > 0 ? values[0] : null
}

function decodeGps(entries, little) {
  const raw = {}
  for (const entry of entries) {
    const key = GPS_TAGS[entry.tag]
    if (!key) continue
    if (entry.type === 2) {
      raw[key] = readAscii(entry)
    } else if (entry.type === 5 || entry.type === 10 || entry.type === 1 || entry.type === 3) {
      raw[key] = readNumbers(entry, little)
    }
  }

  const latitude = dmsToDecimal(raw.latitudeDms, raw.latitudeRef, 'S')
  const longitude = dmsToDecimal(raw.longitudeDms, raw.longitudeRef, 'W')
  const altitude = Array.isArray(raw.altitude) ? raw.altitude[0] : null

  return {
    latitude,
    longitude,
    latitudeRef: raw.latitudeRef || null,
    longitudeRef: raw.longitudeRef || null,
    altitude: typeof altitude === 'number' ? altitude : null,
  }
}

/** 度/分/秒 → 十进制；分母为 0 或数据缺失返回 null；南纬/西经为负 */
function dmsToDecimal(dms, ref, negativeRef) {
  if (!Array.isArray(dms) || dms.length < 3) return null
  const [deg, min, sec] = dms
  if (![deg, min, sec].every((n) => typeof n === 'number' && Number.isFinite(n))) return null
  const decimal = deg + min / 60 + sec / 3600
  return ref === negativeRef ? -decimal : decimal
}
