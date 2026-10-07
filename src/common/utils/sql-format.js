// ============================================================
// SQL 格式化（无副作用、无 DOM 依赖）
//
// 定位是「让 SQL 更易读」，不是 SQL 解析器：
//   - 关键字大写、缩进、主要子句换行
//   - **字符串字面量、注释、标识符内的关键字不改**（最容易出错的地方）
//   - 不校验语法、不改写语义，纯排版
// 零依赖。方言只做主流兼容（MySQL / PostgreSQL 共有部分）。
// ============================================================

/** 主要子句：这些后面强制换行并缩进 */
const CLAUSE_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'LIMIT',
  'OFFSET',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
  'UNION',
  'UNION ALL',
  'INNER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'FULL JOIN',
  'CROSS JOIN',
  'JOIN',
  'ON',
  'USING',
]

/** 仅做大小写变换、不触发换行的关键字 */
const PLAIN_KEYWORDS = [
  'AND',
  'OR',
  'NOT',
  'IN',
  'LIKE',
  'BETWEEN',
  'IS',
  'NULL',
  'DISTINCT',
  'AS',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'EXISTS',
  'ALL',
  'ANY',
  'ASC',
  'DESC',
  'INTO',
  'WITH',
  'RECURSIVE',
  'PARTITION BY',
  'OVER',
  'RETURNING',
]

const ALL_KEYWORDS = new Set([...CLAUSE_KEYWORDS, ...PLAIN_KEYWORDS].map((k) => k.toUpperCase()))

/** 常见的建表 / 数据类型关键字 */
const TYPE_KEYWORDS = new Set([
  'INT',
  'INTEGER',
  'BIGINT',
  'SMALLINT',
  'TINYINT',
  'DECIMAL',
  'NUMERIC',
  'FLOAT',
  'DOUBLE',
  'REAL',
  'VARCHAR',
  'CHAR',
  'TEXT',
  'BLOB',
  'DATE',
  'TIME',
  'TIMESTAMP',
  'DATETIME',
  'BOOLEAN',
  'BOOL',
  'JSON',
  'JSONB',
  'UUID',
  'SERIAL',
  'PRIMARY KEY',
  'FOREIGN KEY',
  'UNIQUE',
  'NOT NULL',
  'DEFAULT',
  'AUTO_INCREMENT',
  'AUTOINCREMENT',
  'REFERENCES',
  'CHECK',
  'CONSTRAINT',
  'CREATE',
  'TABLE',
  'INDEX',
  'VIEW',
  'DROP',
  'ALTER',
  'ADD',
  'COLUMN',
  'IF',
  'EXISTS',
  'CASCADE',
  'RESTRICT',
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
  'TRANSACTION',
])

/**
 * 把文本切成「代码」与「字面量」两类段，避免误处理
 *
 * SQL 里的 'order by' 是字符串、-- 后面是注释、
 * "MyColumn" 是标识符 —— 这些里面的关键字都不能大写或换行。
 * @param {string} sql
 * @returns {{type:'code'|'literal', text:string}[]}
 */
function tokenizeSegments(sql) {
  const text = String(sql ?? '')
  const segments = []
  let buffer = ''
  let i = 0

  const flushCode = () => {
    if (buffer) {
      segments.push({ type: 'code', text: buffer })
      buffer = ''
    }
  }

  while (i < text.length) {
    const rest = text.slice(i)

    // 行注释 -- 与块注释
    if (rest.startsWith('--') || rest.startsWith('#')) {
      flushCode()
      const end = text.indexOf('\n', i)
      const stop = end === -1 ? text.length : end
      segments.push({ type: 'literal', text: text.slice(i, stop) })
      i = stop
      continue
    }
    if (rest.startsWith('/*')) {
      flushCode()
      const end = text.indexOf('*/', i + 2)
      const stop = end === -1 ? text.length : end + 2
      segments.push({ type: 'literal', text: text.slice(i, stop) })
      i = stop
      continue
    }

    // 字符串字面量：单引号（含 '' 转义与反斜杠）、双引号标识符、反引号
    const quote = text[i]
    if (quote === "'" || quote === '"' || quote === '`') {
      flushCode()
      let j = i + 1
      while (j < text.length) {
        if (text[j] === '\\') {
          j += 2
          continue
        }
        if (text[j] === quote) {
          // SQL 里 '' 表示转义的单引号
          if (text[j + 1] === quote) {
            j += 2
            continue
          }
          j += 1
          break
        }
        j += 1
      }
      segments.push({ type: 'literal', text: text.slice(i, j) })
      i = j
      continue
    }

    // 美元引号（PostgreSQL 的 $$ ... $$）
    if (quote === '$') {
      const match = /^\$([A-Za-z_]\w*)?\$/.exec(rest)
      if (match) {
        flushCode()
        const tag = match[0]
        const end = text.indexOf(tag, i + tag.length)
        const stop = end === -1 ? text.length : end + tag.length
        segments.push({ type: 'literal', text: text.slice(i, stop) })
        i = stop
        continue
      }
    }

    buffer += text[i]
    i += 1
  }

  flushCode()
  return segments
}

/** 在代码段里做关键字大写；返回同样长度的文本，段结构不变 */
function uppercaseKeywords(code) {
  // 标识符（引号外的非关键字）保持原样，只替换白名单里的词
  return code.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (word) => {
    const upper = word.toUpperCase()
    return ALL_KEYWORDS.has(upper) || TYPE_KEYWORDS.has(upper) ? upper : word
  })
}

/**
 * 格式化 SQL
 * @param {string} sql
 * @param {object} [options]
 * @param {number|'tab'} [options.indent=2] 缩进
 * @param {boolean} [options.uppercase=true] 关键字是否大写
 * @param {boolean} [options.breakLines=true] 主要子句是否换行
 * @returns {string}
 */
export function formatSql(sql, options = {}) {
  const { indent = 2, uppercase = true, breakLines = true } = options
  const text = String(sql ?? '').trim()
  if (!text) return ''

  const pad = indent === 'tab' ? '\t' : ' '.repeat(Number(indent) || 0)
  const segments = tokenizeSegments(text)

  // 一级子句：用**短语**正则一次匹配。
  // ⚠ 不要拆成逐词扫描——`LEFT JOIN` / `GROUP BY` 会被拆散、
  // 且各词在词流里的深度不同，重组时极易漏前缀（已试过，更复杂且更易错）。
  const CLAUSE_RE =
    /\b(INSERT\s+INTO|DELETE\s+FROM|GROUP\s+BY|ORDER\s+BY|UNION(?:\s+ALL)?|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|NATURAL\s+JOIN|SELECT|FROM|WHERE|HAVING|LIMIT|OFFSET|VALUES|JOIN|SET|UPDATE)\b/gi

  // 首行不缩进，其后每遇到子句按当前括号深度缩进。
  // 深度在**替换过程中**逐段累加，因此 `IN (select …)` 的子查询能拿到 depth=1。
  let out = ''
  let depth = 0

  for (const segment of segments) {
    if (segment.type === 'literal') {
      out += segment.text
      continue
    }

    const code = uppercase ? uppercaseKeywords(segment.text) : segment.text

    if (breakLines) {
      out += code.replace(CLAUSE_RE, (match) => {
        const keyword = uppercase ? match.toUpperCase() : match
        return `\n${pad.repeat(depth)}${keyword} `
      })
    } else {
      out += code
    }

    for (const char of code) {
      if (char === '(') depth += 1
      else if (char === ')') depth = Math.max(0, depth - 1)
    }
  }

  // 替换时关键字后多加了一个空格，与原有的叠成双空格，这里压掉；
  // 逗号后补空格（字面量已单独输出，不会动到字符串内容）
  out = out.replace(/ {2,}/g, ' ').replace(/,(?=\S)/g, ', ')

  // 统一整理：**只 trim 行尾**。行首的缩进是刚生成的，不能碰——
  // 曾在这里做 line.trim()，把括号深度算出来的缩进全清掉了。
  return out
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/**
 * 压缩成单行
 * @param {string} sql
 * @returns {string}
 */
export function minifySql(sql) {
  const text = String(sql ?? '').trim()
  if (!text) return ''
  const segments = tokenizeSegments(text)
  let out = ''
  for (const segment of segments) {
    if (segment.type === 'literal') {
      // 字面量内的换行不能压（多行字符串会改语义）
      out += segment.text
      continue
    }
    out += segment.text.replace(/\s+/g, ' ')
  }
  return out.trim()
}
