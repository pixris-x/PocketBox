// 路由：首页 + 由 tools.js 自动生成的懒加载工具路由（History 模式）
import { createRouter, createWebHistory } from 'vue-router'
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
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const title = to.meta.title
  document.title = title ? `${title} - 口袋工具箱` : '口袋工具箱'
})

export default router
