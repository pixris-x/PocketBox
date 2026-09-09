import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  // History 路由需要绝对 base，否则子路径下资源引用会错
  base: '/',
  plugins: [vue()],
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
