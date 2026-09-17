// ============================================================
// Electron 打包入口：注入 VITE_API_BASE（方案②：桌面端复用线上 API）→
// vite build → electron-builder 出 Windows 安装包。
// 用法：pnpm electron:build，产物在 release/。
// ============================================================
import { spawnSync } from 'node:child_process'
import { build } from 'vite'

process.env.VITE_API_BASE ||= 'https://pocketbox.pixris.online'
console.log(`[electron-build] VITE_API_BASE = ${process.env.VITE_API_BASE}`)

await build({ mode: 'production', logLevel: 'info' })

// npx 会优先解析本仓库 node_modules/.bin 里的 electron-builder
const result = spawnSync('npx', ['electron-builder', '--win'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
process.exit(result.status ?? 1)
