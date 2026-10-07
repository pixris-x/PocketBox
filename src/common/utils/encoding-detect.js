// ============================================================
// 文本编码探测与乱码修复（无副作用、无 DOM 依赖）
//
// 用途：从「文件或粘贴内容全是 �」这类现象里判断原本是什么编码。
//
// ⚠ 能做什么、不能做什么（页面上必须写清，别让人误以为万能）：
//   - 能识别 UTF-8（含 BOM）、UTF-16、GBK、Big5 的**特征与合法性**
//   - 能用浏览器内置的 TextDecoder 尝试解码并判断是否产生替换字符
//   - **不能**保证判断正确：GBK 与 Big5 字节区间高度重叠，短文本尤其难分；
//     二进制文件会被误判为某种编码
//   - 探测结果是「最可能」，不是「确定」
// ============================================================

/** 支持的编码列表（须与 TextDecoder 的标签一致） */
export const ENCODINGS = [
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'gbk', label: 'GBK / GB2312' },
  { value: 'big5', label: 'Big5' },
  { value: 'utf-16le', label: 'UTF-16 LE' },
  { value: 'utf-16be', label: 'UTF-16 BE' },
]

/** BOM 签名表 */
const BOMS = [
  { bytes: [0xef, 0xbb, 0xbf], encoding: 'utf-8', name: 'UTF-8 BOM' },
  { bytes: [0xff, 0xfe], encoding: 'utf-16le', name: 'UTF-16 LE BOM' },
  { bytes: [0xfe, 0xff], encoding: 'utf-16be', name: 'UTF-16 BE BOM' },
]

/**
 * 猜测文本的字符集（按字节序列判断，不是按已解码的字符串）
 * @param {Uint8Array|number[]} input
 * @returns {{encoding:string, label:string, hasBOM:boolean, bomName:string|null, confidence:'high'|'medium'|'low'}}
 */
export function detectEncoding(input) {
  const bytes = toBytes(input)
  const empty = {
    encoding: 'utf-8',
    label: 'UTF-8',
    hasBOM: false,
    bomName: null,
    confidence: 'low',
  }
  if (!bytes.length) return empty

  // ① BOM 最可靠
  for (const bom of BOMS) {
    if (startsWith(bytes, bom.bytes)) {
      return {
        encoding: bom.encoding,
        label: bom.encoding.toUpperCase(),
        hasBOM: true,
        bomName: bom.name,
        confidence: 'high',
      }
    }
  }

  // ② UTF-16 无 BOM：ASCII 字符的高位字节为 0x00，据此定字节序
  if (looksUtf16(bytes)) {
    // 「A」= 41 00 是小端（低字节在前），0x00 落在**奇数下标**；
    // 「00 41」是大端，0x00 落在**偶数下标**。判断写反过一次。
    const littleEndian = countNulls(bytes, 1) > countNulls(bytes, 0)
    return {
      encoding: littleEndian ? 'utf-16le' : 'utf-16be',
      label: littleEndian ? 'UTF-16 LE' : 'UTF-16 BE',
      hasBOM: false,
      bomName: null,
      confidence: 'high',
    }
  }

  // ③ 纯 ASCII：所有字节 < 0x80，UTF-8 与 GBK 解码结果相同
  if (isAsciiOnly(bytes)) {
    return { encoding: 'utf-8', label: 'UTF-8', hasBOM: false, bomName: null, confidence: 'high' }
  }

  // ④ 多字节序列：先试 UTF-8，能严格解码就是它
  if (isValidUtf8(bytes)) {
    return { encoding: 'utf-8', label: 'UTF-8', hasBOM: false, bomName: null, confidence: 'high' }
  }

  // ⑤ 都不是 → 中文环境最常见的是 GBK，但与 Big5 字节区间重叠
  return { encoding: 'gbk', label: 'GBK / GB2312', hasBOM: false, bomName: null, confidence: 'low' }
}

/**
 * 用指定编码解码，返回结果与是否出现替换字符
 * @param {Uint8Array|number[]} input
 * @param {string} encoding 见 ENCODINGS
 * @returns {{ok:boolean, text:string, hasReplacement:boolean, error?:string}}
 */
export function decodeWith(input, encoding = 'utf-8') {
  const bytes = toBytes(input)
  if (!bytes.length) return { ok: false, text: '', hasReplacement: false, error: '内容为空' }
  try {
    const decoder = new TextDecoder(encoding, { fatal: false })
    const text = decoder.decode(bytes)
    // U+FFFD 是解码失败的标记，出现即说明该编码不匹配
    const hasReplacement = text.includes('�')
    return { ok: true, text, hasReplacement }
  } catch (err) {
    return {
      ok: false,
      text: '',
      hasReplacement: false,
      error: err instanceof Error ? err.message : '解码失败',
    }
  }
}

/**
 * 尝试用所有候选编码解码，给出各自是否成功
 *
 * 用于让用户横向对比——很多乱码场景下**两个编码都能解出可读文本**，
 * 只是其中一份是错的，肉眼比算法更可靠。
 * @param {Uint8Array|number[]} input
 * @returns {{encoding:string,label:string,text:string,hasReplacement:boolean,replacementRate:number}[]}
 */
export function tryAllEncodings(input) {
  const bytes = toBytes(input)
  if (!bytes.length) return []
  return ENCODINGS.map((item) => {
    const result = decodeWith(bytes, item.value)
    const rate = result.text ? countChar(result.text, '�') / result.text.length : 1
    return {
      encoding: item.value,
      label: item.label,
      text: result.text,
      hasReplacement: result.hasReplacement,
      replacementRate: rate,
      // 单看「有无替换符」不够：GBK 字节用 UTF-16 解码往往也不报错，
      // 但会解出大量 CJK 控制区与私用区字符。补一个可打印性评分一起看。
      printableRate: result.text ? printableRatio(result.text) : 0,
    }
  }).sort((a, b) => score(b) - score(a))
}

/** 常用字符占比：CJK、ASCII 可打印、常见标点算「正常」 */
function printableRatio(text) {
  let normal = 0
  for (const char of text) {
    const code = char.codePointAt(0)
    if (code === 0xfffd) continue
    if (code < 0x20 || (code >= 0x7f && code < 0xa0)) continue // 控制字符
    if (code >= 0xe000 && code <= 0xf8ff) continue // 私用区
    if (code >= 0xfff9 && code <= 0xfffb) continue // 兼容字符
    if (code >= 0x200e && code <= 0x2027) continue // 方向控制等
    normal += 1
  }
  return text.length ? normal / text.length : 0
}

/** 综合评分：可打印性优先，替换符为次要信号 */
function score(result) {
  return result.printableRate - result.replacementRate * 0.5
}

/**
 * 生成修复建议：把乱码文本按猜测编码还原
 * @param {string} garbled 已乱码的字符串
 * @param {string} from 乱码文本当前被误认的编码
 * @param {string} to 原本正确的编码
 * @returns {{ok:boolean, text:string, changed:boolean}}
 */
export function repairMojibake(garbled, from = 'utf-8', to = 'gbk') {
  const text = String(garbled ?? '')
  if (!text) return { ok: false, text: '', changed: false }
  try {
    // 路径：把「被误认成 from 的字节」重新解读为 to
    const bytes = new TextEncoder().encode(text)
    // TextEncoder 只能产出 UTF-8，故手工取回 from 编码下的原始字节
    const raw = encodeWith(text, from)
    const decoder = new TextDecoder(to, { fatal: false })
    const repaired = decoder.decode(raw)
    void bytes
    return { ok: true, text: repaired, changed: repaired !== text }
  } catch (err) {
    return {
      ok: false,
      text,
      changed: false,
      error: err instanceof Error ? err.message : '修复失败',
    }
  }
}

// ============================================================
// 内部工具
// ============================================================

function toBytes(input) {
  if (input instanceof Uint8Array) return input
  if (Array.isArray(input)) return Uint8Array.from(input)
  if (typeof input === 'string') return new TextEncoder().encode(input)
  return new Uint8Array(0)
}

function startsWith(bytes, prefix) {
  if (bytes.length < prefix.length) return false
  return prefix.every((byte, index) => bytes[index] === byte)
}

function isAsciiOnly(bytes) {
  return bytes.every((byte) => byte < 0x80)
}

/** 严格 UTF-8 校验：按码点结构逐字节走，遇非法序列立刻返回 false */
function isValidUtf8(bytes) {
  let i = 0
  while (i < bytes.length) {
    const byte = bytes[i]
    let extra = 0

    if (byte <= 0x7f) {
      i += 1
      continue
    }
    if (byte >= 0xc2 && byte <= 0xdf) extra = 1
    else if (byte >= 0xe0 && byte <= 0xef) extra = 2
    else if (byte >= 0xf0 && byte <= 0xf4) extra = 3
    else return false

    // 截断的多字节序列视为非法
    if (i + extra >= bytes.length) return false

    for (let j = 1; j <= extra; j += 1) {
      const next = bytes[i + j]
      // 后续字节必须是 10xxxxxx
      if ((next & 0xc0) !== 0x80) return false
    }

    // 排除过长编码与代理区（D800-DFFF）与超平面码点
    if (extra === 2) {
      const code = ((byte & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f)
      if (code < 0x800) return false
      if (code >= 0xd800 && code <= 0xdfff) return false
    } else if (extra === 3) {
      const code =
        ((byte & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f)
      if (code < 0x10000 || code > 0x10ffff) return false
    }

    i += extra + 1
  }
  return true
}

/** UTF-16 无 BOM 特征：奇数位或偶数位大量出现 0x00 */
function looksUtf16(bytes) {
  if (bytes.length < 4) return false
  if (bytes.length % 2 !== 0) return false
  const zeros = countNulls(bytes, 0) + countNulls(bytes, 1)
  // 超过 30% 的字节为 0 才算 UTF-16（普通文本不会有这么多 0x00）
  return zeros / bytes.length > 0.3
}

function countNulls(bytes, offset) {
  let count = 0
  for (let i = offset; i < bytes.length; i += 2) {
    if (bytes[i] === 0) count += 1
  }
  return count
}

function countChar(text, char) {
  let count = 0
  for (const item of text) {
    if (item === char) count += 1
  }
  return count
}

/** 把字符串按指定编码取回字节（仅支持单字节族，用于乱码还原） */
function encodeWith(text, encoding) {
  if (encoding === 'utf-8') return new TextEncoder().encode(text)
  // 其他编码无法直接编码回原字节，退回 UTF-8 字节
  // （这意味着 repairMojibake 只在「误认编码是 UTF-8」时严格正确）
  return new TextEncoder().encode(text)
}
