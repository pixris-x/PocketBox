// 文本行级 diff（纯函数，可复用）
// 基于 LCS 动态规划，产出左右对照的变更行序列

const MAX_LINES = 2000 // 超出则用简单对照，避免 O(n*m) 卡死

function normalize(text, { ignoreCase, ignoreWhitespace }) {
  let line = text
  if (ignoreWhitespace) line = line.replace(/\s+/g, '')
  if (ignoreCase) line = line.toLowerCase()
  return line
}

/** 最长公共子序列下标回溯 → ['equal' | 'left' | 'right'] 操作序列 */
function lcsOps(a, b) {
  const n = a.length
  const m = b.length
  // dp[i][j]：a[i..] 与 b[j..] 的 LCS 长度
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const ops = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push('equal')
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push('left')
      i++
    } else {
      ops.push('right')
      j++
    }
  }
  while (i < n) {
    ops.push('left')
    i++
  }
  while (j < m) {
    ops.push('right')
    j++
  }
  return ops
}

/**
 * 左右文本 diff
 * @param {string} leftText
 * @param {string} rightText
 * @param {{ ignoreCase?: boolean, ignoreWhitespace?: boolean }} options
 * @returns {{ rows: Array<{type,leftNum,leftText,rightNum,rightText}>, stats: { added, removed, same } }}
 */
export function diffText(leftText, rightText, options = {}) {
  const { ignoreCase = false, ignoreWhitespace = false, maxLines = MAX_LINES } = options
  const leftLines = String(leftText ?? '').split(/\r?\n/)
  const rightLines = String(rightText ?? '').split(/\r?\n/)

  const comparable =
    leftLines.length <= maxLines && rightLines.length <= maxLines
      ? lcsOps(
          leftLines.map((line) => normalize(line, { ignoreCase, ignoreWhitespace })),
          rightLines.map((line) => normalize(line, { ignoreCase, ignoreWhitespace }))
        )
      : null

  const rows = []
  let leftNum = 0
  let rightNum = 0
  let added = 0
  let removed = 0
  let same = 0

  const push = (type, left, right) => {
    rows.push({
      type,
      // 用 null 判断该侧是否有行：空字符串是合法内容（空行），
      // 早前写成 `left ? ...` 会让空行既拿不到行号、又打乱后续行的编号
      leftNum: left === null ? null : ++leftNum,
      rightNum: right === null ? null : ++rightNum,
      leftText: left ?? '',
      rightText: right ?? '',
    })
    if (type === 'equal') same++
    else if (type === 'remove') removed++
    else if (type === 'add') added++
  }

  if (!comparable) {
    const total = Math.max(leftLines.length, rightLines.length)
    for (let k = 0; k < total; k++) {
      const l = k < leftLines.length ? leftLines[k] : null
      const r = k < rightLines.length ? rightLines[k] : null
      if (l !== null && r !== null && normalize(l, options) === normalize(r, options))
        push('equal', l, r)
      else if (l !== null && r !== null) push('change', l, r)
      else if (l !== null) push('remove', l, null)
      else push('add', null, r)
    }
  } else {
    let li = 0
    let ri = 0
    for (const op of comparable) {
      if (op === 'equal') push('equal', leftLines[li++], rightLines[ri++])
      else if (op === 'left') push('remove', leftLines[li++], null)
      else push('add', null, rightLines[ri++])
    }
  }

  return { rows, stats: { added, removed, same } }
}
