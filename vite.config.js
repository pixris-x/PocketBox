import { fileURLToPath, URL } from 'node:url'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const SW_PLACEHOLDER = '__SW_VERSION__'
const SW_FILE = 'sw.js'
const distDir = fileURLToPath(new URL('./dist', import.meta.url))
const pkgPath = fileURLToPath(new URL('./package.json', import.meta.url))

// 收集目录下全部文件，返回 [相对路径, 绝对路径]，相对路径统一用 / 分隔
function collectFiles(dir, baseDir = dir, collected = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) collectFiles(fullPath, baseDir, collected)
    else
      collected.push([
        fullPath
          .slice(baseDir.length + 1)
          .split('\\')
          .join('/'),
        fullPath,
      ])
  }
  return collected
}

// 以 dist 全部产物的内容指纹作为构建标识（排除 sw.js 自身，避免自引用）
function hashDist(dir) {
  const hash = createHash('sha256')
  collectFiles(dir)
    .filter(([relativePath]) => relativePath !== SW_FILE)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .forEach(([relativePath, fullPath]) => {
      hash.update(relativePath)
      hash.update(readFileSync(fullPath))
    })
  return hash.digest('hex').slice(0, 8)
}

// 构建期把 public/sw.js 的版本占位符替换为「包版本 + 产物内容指纹」。
// 产物有任何变化指纹就会变 → 缓存名随之改变 → activate 必然清理旧缓存，
// 不再依赖"发版记得手工改 VERSION"这种会忘的约定。
function serviceWorkerVersion() {
  return {
    name: 'pocketbox-sw-version',
    apply: 'build',
    closeBundle() {
      const swPath = join(distDir, SW_FILE)
      const source = readFileSync(swPath, 'utf-8')

      // 没替换成功会导致用户长期停留在旧缓存且难以排查，直接让构建失败
      if (!source.includes(SW_PLACEHOLDER)) {
        throw new Error(
          `[sw-version] dist/${SW_FILE} 中未找到 ${SW_PLACEHOLDER} 占位符，请检查 public/${SW_FILE}`
        )
      }

      const { version } = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      const swVersion = `${version}-${hashDist(distDir)}`
      writeFileSync(swPath, source.split(SW_PLACEHOLDER).join(swVersion))
      console.log(`\n  \u2713 sw.js 版本已注入: ${swVersion}\n`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // History 路由需要绝对 base，否则子路径下资源引用会错
  base: '/',
  plugins: [vue(), serviceWorkerVersion()],
  // Vitest 配置（与构建共用 @ 别名与插件解析）
  test: {
    // 单元测试只覆盖纯函数，用 node 环境，不需要 DOM
    environment: 'node',
    include: ['tests/**/*.spec.js'],
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // terser 源码注释里含 #__PURE__ 字样，Rollup 注解扫描会误报，无实际影响
        if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('terser')) return
        warn(warning)
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 全局注入公共设计 token 与混入，页面/组件样式可直接使用
        additionalData: `@use "@/common/styles/_variables.scss" as *; @use "@/common/styles/_mixins.scss" as *;`,
      },
    },
  },
})
