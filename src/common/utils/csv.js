// ============================================================
// CSV 工具：解析 / 生成（纯函数，正确处理引号包裹与转义）
// 遵循 RFC 4180 的常用子集：字段可由双引号包裹，
// 包裹后字段内可含分隔符、换行，双引号本身用连续两个双引号表示。
// ============================================================

/** 可选分隔符（UiSelect 选项） */
export const DELIMITERS = [
  { value: ',', label: '逗号 ,' },
  { value: '\t', label: '制表符 Tab' },
  { value: ';', label: '分号 ;' },
  { value: '|', label: '竖线 |' },
]

/**
 * 把 CSV 文本解析为二维字符串数组
 * @param {string} text
 * @param {string} [delimiter]
 * @returns {string[][]}
 */
export function parseCsvRows(text, delimiter = ',') {
  const source = String(text ?? '').replace(/\r\n?/g, '\n')
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let index = 0

  while (index < source.length) {
    const char = source[index]

    if (inQuotes) {
      if (char === '"') {
        // 连续两个双引号代表一个转义后的双引号
        if (source[index + 1] === '"') {
          field += '"'
          index += 2
          continue
        }
        inQuotes = false
        index += 1
        continue
      }
      field += char
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = true
      index += 1
      continue
    }
    if (char === delimiter) {
      row.push(field)
      field = ''
      index += 1
      continue
    }
    if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      index += 1
      continue
    }
    field += char
    index += 1
  }

  // 文本以换行结尾时不产生多余的空行
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

/** 空行（只有一个字段且内容全为空白）不算数据行；只含分隔符的行保留 */
function isBlankRow(row) {
  return row.length === 1 && row[0].trim() === ''
}

/** 表头去空白、补空位、去重名（重名追加 _2、_3） */
function normaliseHeaders(row, width) {
  const used = new Map()
  return Array.from({ length: width }, (_, index) => {
    let name = (row[index] ?? '').trim() || `列${index + 1}`
    if (used.has(name)) {
      const next = used.get(name) + 1
      used.set(name, next)
      name = `${name}_${next}`
    } else {
      used.set(name, 1)
    }
    return name
  })
}

/**
 * 按内容推断类型。保留前导 0 的串（007、手机号）不转数字。
 */
function inferValue(raw) {
  const text = String(raw ?? '').trim()
  if (text === '') return ''
  if (text === 'true') return true
  if (text === 'false') return false
  if (text === 'null') return null
  if (/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(text)) return Number(text)
  return text
}

/**
 * CSV 文本 → 对象数组
 * @param {string} text
 * @param {{delimiter?:string, hasHeader?:boolean, inferTypes?:boolean}} [options]
 * @returns {object[]}
 */
export function csvToJson(text, options = {}) {
  const { delimiter = ',', hasHeader = true, inferTypes = false } = options
  const rows = parseCsvRows(text, delimiter).filter((row) => !isBlankRow(row))
  if (!rows.length) return []

  const width = rows.reduce((max, row) => Math.max(max, row.length), 0)
  const headers = hasHeader
    ? normaliseHeaders(rows[0], width)
    : Array.from({ length: width }, (_, index) => `列${index + 1}`)
  const body = hasHeader ? rows.slice(1) : rows

  return body.map((row) => {
    const record = {}
    headers.forEach((header, index) => {
      const raw = row[index] ?? ''
      record[header] = inferTypes ? inferValue(raw) : raw
    })
    return record
  })
}

/**
 * 检查各行列数是否与首行一致（列数不齐是 CSV 最常见的脏数据）
 * @param {string} text
 * @param {string} [delimiter]
 * @returns {{width:number, ragged:{line:number, length:number}[]}} line 从 1 起算
 */
export function findRaggedRows(text, delimiter = ',') {
  const rows = parseCsvRows(text, delimiter).filter((row) => !isBlankRow(row))
  if (!rows.length) return { width: 0, ragged: [] }
  const width = rows[0].length
  const ragged = []
  rows.forEach((row, index) => {
    if (row.length !== width) ragged.push({ line: index + 1, length: row.length })
  })
  return { width, ragged }
}

function stringifyValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** 需要时用双引号包裹并转义 */
function escapeField(value, delimiter) {
  const text = stringifyValue(value)
  const needsQuote =
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r') ||
    text.includes(delimiter) ||
    text !== text.trim()
  return needsQuote ? `"${text.replace(/"/g, '""')}"` : text
}

/** 把任意 JSON 值规整为对象数组，便于取并集列 */
function normaliseRecords(data) {
  if (data === null || data === undefined) return []
  if (Array.isArray(data)) {
    return data.map((item) => {
      if (Array.isArray(item)) {
        return Object.fromEntries(item.map((value, index) => [`列${index + 1}`, value]))
      }
      if (item && typeof item === 'object') return item
      return { value: item }
    })
  }
  if (typeof data === 'object') return [data]
  return [{ value: data }]
}

/**
 * JSON 值 → CSV 文本。数组内对象的键取并集作为列，缺失值留空。
 * @param {any} data
 * @param {{delimiter?:string, includeHeader?:boolean}} [options]
 * @returns {string}
 */
export function jsonToCsv(data, options = {}) {
  const { delimiter = ',', includeHeader = true } = options
  const records = normaliseRecords(data)
  if (!records.length) return ''

  const headers = [...new Set(records.flatMap((record) => Object.keys(record)))]
  const lines = []
  if (includeHeader) {
    lines.push(headers.map((header) => escapeField(header, delimiter)).join(delimiter))
  }
  for (const record of records) {
    lines.push(headers.map((header) => escapeField(record[header], delimiter)).join(delimiter))
  }
  return lines.join('\n')
}
