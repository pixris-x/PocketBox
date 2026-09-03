import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue()],
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
