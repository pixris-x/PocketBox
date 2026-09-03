// 路由：首页 + 由 tools.js 自动生成的懒加载工具路由（Hash 模式）
import { createRouter, createWebHashHistory } from 'vue-router'
import { tools } from '@/data/tools'

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
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const title = to.meta.title
  document.title = title ? `${title} - 本地工具集` : '本地工具集'
})

export default router
