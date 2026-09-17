// ============================================================
// Electron 主进程
//   - 开发：scripts/electron-dev.mjs 注入 VITE_DEV_SERVER_URL，直接加载 Vite
//   - 生产：注册 app:// 自定义协议（standard + secure），由本进程托管 dist/
//     History 路由、动态 import 与 fetch 均原样工作，无需改成 hash 模式
//   - 安全：contextIsolation + sandbox，渲染层没有 Node 能力
// ============================================================
const { app, BrowserWindow, protocol } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const APP_SCHEME = 'app'
const APP_ORIGIN = 'app://pocketbox'
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || ''
const DIST_DIR = path.join(__dirname, '..', 'dist')

// app:// 必须在 app ready 之前注册为 standard + secure，页面才能发起跨源 fetch
// （IP 归属地请求发往线上服务端，CORS 白名单见 backend Program.cs）
protocol.registerSchemesAsPrivileged([
  { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
])

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain',
}

/** 把 app://pocketbox/<path> 解析为 dist 内文件；未命中（前端路由）回落 index.html */
function resolveDistFile(rawUrl) {
  const pathname = decodeURIComponent(new URL(rawUrl).pathname).replace(/^\/+/, '')
  const candidate = path.resolve(DIST_DIR, pathname)
  // 防路径穿越：解析结果必须仍在 dist 内
  if (
    pathname &&
    candidate.startsWith(DIST_DIR + path.sep) &&
    fs.existsSync(candidate) &&
    fs.statSync(candidate).isFile()
  ) {
    return candidate
  }
  return path.join(DIST_DIR, 'index.html')
}

function registerAppProtocol() {
  protocol.handle(APP_SCHEME, async (request) => {
    const file = resolveDistFile(request.url)
    const type = MIME_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream'
    const body = await fs.promises.readFile(file)
    return new Response(body, { headers: { 'content-type': type } })
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (DEV_SERVER_URL) {
    win.loadURL(DEV_SERVER_URL)
  } else {
    win.loadURL(`${APP_ORIGIN}/index.html`)
  }
  return win
}

app.whenReady().then(() => {
  if (!DEV_SERVER_URL) {
    registerAppProtocol()
  }
  createWindow()

  app.on('activate', () => {
    // macOS 关闭窗口后点 dock 图标重建窗口
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
