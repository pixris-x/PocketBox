// ============================================================
// 口袋工具箱 PocketBox — Service Worker（手写，无第三方依赖）
// 目标：整站离线可用；构建产物带 hash 可长期缓存，页面走网络优先保证更新
// 注意：本文件位于 public/，构建时原样拷贝到 dist 根目录，作用域为站点根
// 版本号：下面的占位符由 vite.config.js 的 pocketbox-sw-version 插件在构建期
//         替换为「package.json 版本 + dist 产物内容指纹」，无需手工维护，
//         产物一变版本就变，旧缓存必然被 activate 清理。
// ============================================================

const VERSION = '__SW_VERSION__'
const SHELL_CACHE = `pocketbox-shell-${VERSION}`
const ASSET_CACHE = `pocketbox-assets-${VERSION}`

// 应用外壳：离线时至少要能打开首页
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // 单个资源失败不应导致整个安装失败
      .then((cache) => Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

/** 网络优先，失败回退缓存（用于导航请求） */
async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE)
      cache.put(fallbackUrl || request.url, response.clone())
    }
    return response
  } catch {
    const cache = await caches.open(SHELL_CACHE)
    const cached = await cache.match(fallbackUrl || request.url)
    if (cached) return cached
    const shell = await cache.match('/index.html')
    if (shell) return shell
    throw new Error('offline')
  }
}

/** 缓存优先（用于带 hash 的构建产物，内容不变即可永久复用） */
async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response && response.ok) cache.put(request, response.clone())
  return response
}

/** 后台更新 + 立即返回缓存（用于图标等可能变化不频繁的资源） */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)
  return cached || network
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // 子路由刷新：离线时用 index.html 兜底，交给前端路由渲染 404 页
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/index.html'))
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  event.respondWith(staleWhileRevalidate(request))
})

// 页面检测到新版本后可 postMessage({ type: 'SKIP_WAITING' }) 立即接管
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})
