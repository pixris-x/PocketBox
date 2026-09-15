// ============================================================
// 口袋工具箱 PocketBox — 容器内静态文件服务器（零依赖）
// 职责：托管 dist/ + History 路由 SPA fallback
// gzip / 强缓存 / 安全头等由宿主机 nginx 反向代理层负责
// ============================================================
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = Number(process.env.PORT) || 3000
const DIST = path.resolve(__dirname, '../dist')
const INDEX = path.join(DIST, 'index.html')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'X-Content-Type-Options': 'nosniff', ...headers })
  res.end(body)
}

/** 取访问者公网 IP：优先用反代传来的真实地址（见 deploy/nginx.conf），直连时回落 socket */
function clientIp(req) {
  const candidates = [
    req.headers['x-real-ip'],
    String(req.headers['x-forwarded-for'] || '').split(',')[0],
    req.socket.remoteAddress,
  ]
  for (const raw of candidates) {
    const value = String(raw || '').trim()
    if (!value) continue
    // IPv6-mapped IPv4（::ffff:1.2.3.4）还原成 IPv4，前端可直接拿去查离线归属地
    return value.startsWith('::ffff:') ? value.slice(7) : value
  }
  return ''
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' })
  }

  // 解码并防路径穿越：解析后的路径必须仍在 dist 内
  let urlPath
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  } catch {
    return send(res, 400, 'Bad Request')
  }
  // 同源端点：回报访问者自己的公网 IP，供前端「我的公网 IP」使用。
  // 不落日志、不落盘，IP 只出现在这一次响应里
  if (urlPath === '/api/ip') {
    return send(res, 200, JSON.stringify({ ip: clientIp(req) }), {
      'Content-Type': 'application/json; charset=utf-8',
      // 出口 IP 随时可能变，禁止任何一层缓存（包括 Service Worker）
      'Cache-Control': 'no-store, must-revalidate',
    })
  }

  const filePath = path.normalize(path.join(DIST, urlPath))
  if (!filePath.startsWith(DIST + path.sep) && filePath !== DIST) {
    return send(res, 403, 'Forbidden')
  }

  fs.stat(filePath, (err, stat) => {
    let target = filePath
    if (!err && stat.isDirectory()) target = path.join(filePath, 'index.html')

    fs.readFile(target, (readErr, data) => {
      if (!readErr) {
        const ext = path.extname(target).toLowerCase()
        const isHashedAsset = urlPath.startsWith('/assets/')
        // 产物文件名带 hash 可强缓存一年；其余文件每次协商校验
        const cacheControl = isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache'
        const headers = {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': cacheControl,
        }

        // 协商缓存：11MB 的离线 IP 库靠它把重复访问压成一次 304。
        // 命中目录索引时 target 已是 index.html，但 stat 仍属原目录、mtime 不可信，故跳过
        if (!isHashedAsset && target === filePath) {
          const etag = `W/"${data.length.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`
          headers.ETag = etag
          headers['Last-Modified'] = stat.mtime.toUTCString()
          if (req.headers['if-none-match'] === etag) {
            return send(res, 304, '', { ETag: etag, 'Cache-Control': cacheControl })
          }
        }

        return send(res, 200, data, headers)
      }

      // SPA fallback：无扩展名的未知路径回退 index.html，交给前端路由渲染 404 页；
      // 带扩展名的（如 /favicon.ico）确实不存在，老实返回 404
      if (!path.extname(urlPath)) {
        return fs.readFile(INDEX, (idxErr, html) => {
          if (idxErr) return send(res, 500, 'index.html missing')
          send(res, 200, html, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' })
        })
      }
      send(res, 404, 'Not Found')
    })
  })
})

server.listen(PORT, () => {
  console.log(`pocket-box serving dist/ at http://0.0.0.0:${PORT}`)
})
