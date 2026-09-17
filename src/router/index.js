// 路由：首页 + 由 tools.js 自动生成的懒加载工具路由（History 模式）
import { createRouter, createWebHistory } from 'vue-router'
import { tools } from '@/data/tools'
import { markHomeNavigation, recordRecentTool } from '@/common/utils/home-state'

// 区分导航来源：popstate 表示浏览器返回/前进，其余为站内点击导航。
// 首页据此决定「恢复上次位置」还是「回到顶部」。
let viaPopstate = false
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    viaPopstate = true
  })
}

// 已合并工具的旧路径 → 合并页 + 对应 Tab。
// 保留重定向是为了不让已发布的链接、用户收藏和搜索引擎结果 404。
const LEGACY_REDIRECTS = [
  ['md5', 'hash', 'md5'],
  ['sha', 'hash', 'sha'],
  ['csv-json', 'json', 'csv'],
  ['xml-json', 'json', 'xml'],
  ['yaml-json', 'json', 'yaml'],
  ['timestamp', 'datetime', 'timestamp'],
  ['date-calc', 'datetime', 'date-calc'],
  ['cron', 'datetime', 'cron'],
  ['whitespace', 'text-toolkit', 'whitespace'],
  ['aes', 'crypto', 'aes'],
  ['jwt', 'crypto', 'jwt'],
  ['totp', 'crypto', 'totp'],
  ['image-convert', 'image', 'convert'],
  ['favicon', 'image', 'favicon'],
  ['exif', 'image', 'exif'],
  ['qr-scan', 'qrcode', 'scan'],
  ['uuid', 'random', 'uuid'],
  ['password', 'random', 'password'],
  ['fake-text', 'random', 'fake-text'],
  ['base64', 'encoding', 'base64'],
  ['url', 'encoding', 'url'],
]

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/Home/index.vue'),
    meta: { title: '首页' },
  },
  ...tools.map((tool) => ({
    path: tool.path,
    name: tool.id,
    component: () => import(`@/views/tools/${tool.id}/index.vue`),
    meta: { title: tool.title },
  })),
  ...LEGACY_REDIRECTS.map(([legacyId, target, tab]) => ({
    path: `/tool/${legacyId}`,
    redirect: () => ({ path: `/tool/${target}`, query: { tab } }),
  })),
  {
    path: '/404',
    name: 'not-found',
    component: () => import('@/views/NotFound/index.vue'),
    meta: { title: '页面不存在' },
  },
  // 未知路径保留原 URL 渲染 404 页，不重定向，方便用户看清输错的地址
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found-catch-all',
    component: () => import('@/views/NotFound/index.vue'),
    meta: { title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // 滚动恢复分三类：
  //  - 同页仅 query/hash 变化（如切合并页的 Tab）：不动滚动位置
  //  - 首页：内容高度会变（最近使用区块出现等），像素坐标不可靠，
  //    由 Home 组件按「锚点」恢复（仅浏览器返回/前进时），这里返回 false 不干预
  //  - 其他路由：后退/前进沿用 savedPosition，新导航回顶部
  scrollBehavior(to, from, savedPosition) {
    if (from && to.path === from.path) return false
    if (to.name === 'home') return false
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const title = to.meta.title
  document.title = title ? `${title} - 口袋工具箱` : '口袋工具箱'
  // 记录「最近使用」：工具页进入即计入，首页据此置顶展示
  if (to.path.startsWith('/tool/') && to.name && typeof to.name === 'string') {
    recordRecentTool(to.name)
  }
  if (to.name === 'home') markHomeNavigation(viaPopstate)
  viaPopstate = false
})

export default router
