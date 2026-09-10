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
        return send(res, 200, data, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          // 产物文件名带 hash，强缓存一年；其余文件每次协商校验
          'Cache-Control': isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
        })
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
