// ============================================================
// Electron 打包入口：注入 VITE_API_BASE（方案②：桌面端复用线上 API）→
// vite build → electron-builder 出 Windows 安装包。
// 用法：
//   pnpm electron:build    只本机出包，产物在 release/（不推任何远端）
//   pnpm electron:release  出包并把安装包 + latest.yml 发到 GitHub Releases，
//                          需先设 GH_TOKEN（桌面端 electron-updater 就认这个源）
// ============================================================
import { spawnSync } from 'node:child_process'
import { build } from 'vite'

process.env.VITE_API_BASE ||= 'https://pocketbox.pixris.online'
console.log(`[electron-build] VITE_API_BASE = ${process.env.VITE_API_BASE}`)

await build({ mode: 'production', logLevel: 'info' })

// 不带 --publish 时不给 electron-builder 任何 publish 参数：它默认的 auto 策略
// 只在 CI 下发布，所以本机跑不会误推版本。发布走 package.json 的 electron:release。
const shouldPublish = process.argv.includes('--publish')
if (shouldPublish && !process.env.GH_TOKEN) {
  console.error('[electron-build] 发布需要 GH_TOKEN 环境变量，已中止（未构建远端版本）')
  process.exit(1)
}

// npx 会优先解析本仓库 node_modules/.bin 里的 electron-builder
const result = spawnSync(
  'npx',
  ['electron-builder', '--win', ...(shouldPublish ? ['--publish', 'always'] : [])],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  }
)
process.exit(result.status ?? 1)
