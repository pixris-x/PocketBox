// ============================================================
// 首页状态纯函数 + 本地持久化
//   - 最近使用工具：打开工具页时记录，首页置顶展示（localStorage，跨会话）
//   - 首页筛选条件：搜索关键词 + 分类（sessionStorage，只在本次标签页会话内保持）
// 所有读写都对「无 storage 环境」与解析失败做了兜底，绝不抛异常。
// ============================================================

const RECENT_KEY = 'pocketbox:recent-tools'
const FILTER_KEY = 'pocketbox:home-filter'
const ANCHOR_KEY = 'pocketbox:home-anchor'

export const RECENT_LIMIT = 4

/**
 * 从「视口内候选锚点」里挑出当前位置对应的一个：取 top ≤ threshold 的最后一个。
 * 候选需按 DOM 顺序（即 top 升序）传入。纯函数，便于测试。
 * @param {{anchor:string, top:number}[]} candidates
 * @param {number} [threshold] 视口顶部判定线（px）
 * @returns {{anchor:string, offset:number} | null} offset 为该锚点此刻相对视口顶部的偏移
 */
export function pickAnchor(candidates, threshold = 0) {
  if (!Array.isArray(candidates)) return null
  let picked = null
  for (const item of candidates) {
    if (!item || typeof item.anchor !== 'string' || !Number.isFinite(item.top)) continue
    if (item.top <= threshold) picked = item
    else break // 后续锚点都在判定线之下
  }
  if (!picked) return null
  return { anchor: picked.anchor, offset: picked.top }
}

/** 记录离开首页时的锚点（一次性消费） */
export function saveHomeAnchor(state) {
  if (!state || typeof state.anchor !== 'string') {
    removeKey(ANCHOR_KEY, 'session')
    return
  }
  writeJson(ANCHOR_KEY, { anchor: state.anchor, offset: Number(state.offset) || 0 }, 'session')
}

export function readHomeAnchor() {
  const data = readJson(ANCHOR_KEY, () => null, 'session')
  if (!data || typeof data.anchor !== 'string') return null
  return { anchor: data.anchor, offset: Number(data.offset) || 0 }
}

export function clearHomeAnchor() {
  removeKey(ANCHOR_KEY, 'session')
}

// ---- 本次进入首页的导航来源（由 router 写入，Home 挂载时消费一次） ----
// 只有浏览器「返回 / 前进」（popstate）才恢复上次的位置；
// 点 logo 等站内导航回到首页时应停在顶部。
let homeNavigatedViaPop = false

export function markHomeNavigation(viaPop) {
  homeNavigatedViaPop = Boolean(viaPop)
}

/** 消费标记：读取后立即复位，避免影响后续导航 */
export function consumeHomeNavigation() {
  const value = homeNavigatedViaPop
  homeNavigatedViaPop = false
  return value
}

/**
 * 把 id 置顶到最近使用列表（去重 + 截断）。纯函数，便于测试。
 * @param {string[]} list 现有列表
 * @param {string} id 新进入的工具 id
 * @param {number} [limit]
 * @returns {string[]}
 */
export function pushRecent(list, id, limit = RECENT_LIMIT) {
  const current = Array.isArray(list) ? list.filter((item) => typeof item === 'string' && item) : []
  const value = String(id ?? '').trim()
  if (!value) return current.slice(0, limit)
  return [value, ...current.filter((item) => item !== value)].slice(0, limit)
}

export function readRecentTools() {
  return readJson(
    RECENT_KEY,
    (data) => (Array.isArray(data) ? data.filter((item) => typeof item === 'string' && item) : []),
    'local'
  )
}

export function recordRecentTool(id) {
  writeJson(RECENT_KEY, pushRecent(readRecentTools(), id), 'local')
}

export function clearRecentTools() {
  removeKey(RECENT_KEY, 'local')
}

/**
 * 读取首页筛选状态
 * @returns {{keyword: string, category: string}}
 */
export function readHomeFilter() {
  const fallback = { keyword: '', category: 'all' }
  const data = readJson(FILTER_KEY, () => null, 'session')
  if (!data || typeof data !== 'object') return fallback
  return {
    keyword: typeof data.keyword === 'string' ? data.keyword : '',
    category: typeof data.category === 'string' ? data.category : 'all',
  }
}

export function saveHomeFilter({ keyword = '', category = 'all' } = {}) {
  writeJson(FILTER_KEY, { keyword, category }, 'session')
}

function getStorage(kind) {
  try {
    const storage = kind === 'session' ? globalThis.sessionStorage : globalThis.localStorage
    return storage || null
  } catch {
    return null // 隐私模式等禁用 storage 的场景
  }
}

function readJson(key, normalize, kind) {
  const storage = getStorage(kind)
  if (!storage) return normalize(null)
  try {
    const raw = storage.getItem(key)
    return normalize(raw ? JSON.parse(raw) : null)
  } catch {
    return normalize(null)
  }
}

function writeJson(key, value, kind) {
  const storage = getStorage(kind)
  if (!storage) return
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // 配额满或禁用：忽略，不影响功能
  }
}

function removeKey(key, kind) {
  const storage = getStorage(kind)
  if (!storage) return
  try {
    storage.removeItem(key)
  } catch {
    // 忽略
  }
}
