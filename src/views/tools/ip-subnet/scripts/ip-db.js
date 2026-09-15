// ============================================================
// 离线 IP 归属地库的获取与缓存（浏览器侧，仅取本站静态文件）
// 纯查询算法在 common/utils/ip-region.js，这里只负责「把数据拿到并留住」。
// 首次访问需下载约 11MB，之后走 Cache Storage，不再产生任何网络请求。
// ============================================================
import { createXdbSearcher } from '@/common/utils/ip-region'

const DB_URL = '/ip2region/ip2region_v4.xdb'

// 桶名不带构建版本号，配合 public/sw.js 的 KEEP_UNVERSIONED 白名单，
// 发新版时不会被 activate 清掉，用户不必重下 11MB
const CACHE_NAME = 'pocketbox-ipdb-v1'

const hasCacheStorage = () => typeof caches !== 'undefined'

async function readFromCache() {
  if (!hasCacheStorage()) return null
  try {
    const cache = await caches.open(CACHE_NAME)
    const hit = await cache.match(DB_URL)
    if (!hit) return null
    return await hit.arrayBuffer()
  } catch {
    // 缓存层异常不该阻断功能，退化成重新下载
    return null
  }
}

async function writeToCache(buffer) {
  if (!hasCacheStorage()) return
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(DB_URL, new Response(buffer))
  } catch {
    // 配额不足等情况忽略：本次仍可用内存里的数据，只是下次还要再下
  }
}

/** 流式下载并回报进度；拿不到 Content-Length 时退化为一次性读取 */
async function download(onProgress) {
  const response = await fetch(DB_URL, { cache: 'no-cache' })
  if (!response.ok) {
    throw new Error(`离线库下载失败（HTTP ${response.status}），请确认服务端已部署该文件`)
  }

  const total = Number(response.headers.get('content-length')) || 0
  if (!response.body || !total) {
    const buffer = await response.arrayBuffer()
    onProgress({ loaded: buffer.byteLength, total: buffer.byteLength })
    return buffer
  }

  const reader = response.body.getReader()
  const chunks = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    onProgress({ loaded, total })
  }

  const merged = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  return merged.buffer
}

let pending = null

/**
 * 加载查询器（单例）。首次调用才下载数据。
 * @param {(status: {phase: string, loaded?: number, total?: number}) => void} onStatus
 * @returns {Promise<ReturnType<typeof createXdbSearcher>>}
 */
export function loadRegionSearcher(onStatus = () => {}) {
  if (pending) return pending

  pending = (async () => {
    onStatus({ phase: 'checking' })
    const cached = await readFromCache()
    if (cached) {
      onStatus({ phase: 'parsing' })
      return createXdbSearcher(cached)
    }

    onStatus({ phase: 'downloading', loaded: 0, total: 0 })
    const buffer = await download(({ loaded, total }) =>
      onStatus({ phase: 'downloading', loaded, total })
    )

    onStatus({ phase: 'parsing' })
    const searcher = createXdbSearcher(buffer)

    onStatus({ phase: 'caching' })
    await writeToCache(buffer)
    return searcher
  })()

  // 失败后允许重试，否则一次网络抖动就永久卡在错误态
  pending.catch(() => {
    pending = null
  })

  return pending
}

/** 本地是否已经存过离线库（用于给出「需下载 11MB」的提示） */
export async function hasCachedDb() {
  if (!hasCacheStorage()) return false
  try {
    const cache = await caches.open(CACHE_NAME)
    return Boolean(await cache.match(DB_URL))
  } catch {
    return false
  }
}

export const DB_SIZE_HINT = '约 11MB'
