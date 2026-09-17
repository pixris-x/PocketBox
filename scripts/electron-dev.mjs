// ============================================================
// Electron 开发入口：编程式启动 Vite dev server，再拉起 Electron 并注入地址。
// 用法：pnpm electron:dev（等价 node scripts/electron-dev.mjs）
// IP 接口走 vite.config.js 里的 /api proxy（需要本地 .NET 后端在 5048 运行）。
// ============================================================
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
const electronBinary = require('electron')

const server = await createServer({ configFile: 'vite.config.js' })
await server.listen()

const localUrl = server.resolvedUrls?.local?.[0] || 'http://localhost:5173/'
console.log(`[electron-dev] Vite dev server: ${localUrl}`)

const child = spawn(electronBinary, ['.'], {
  stdio: 'inherit',
  windowsHide: true,
  env: { ...process.env, VITE_DEV_SERVER_URL: localUrl },
})

child.on('close', async () => {
  await server.close()
  process.exit(0)
})

// Ctrl+C 时同时回收 Electron 子进程
process.on('SIGINT', () => {
  child.kill()
  process.exit(0)
})
