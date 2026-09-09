<script setup>
// 首页：hero + 工具卡片网格（数据源 data/tools.js）
import { tools } from '@/data/tools'
import ToolCard from '@/components/ToolCard/index.vue'
import BrandLogo from '@/components/BrandLogo/index.vue'
</script>

<template>
  <div class="home">
    <div class="container">
      <section class="home__hero">
        <BrandLogo class="home__hero-icon" :size="60" />
        <h1 class="home__hero-title">口袋工具箱</h1>
        <p class="home__hero-desc">
          常用开发与生活小工具集合 · 全部在浏览器本地运行，数据不会上传到任何服务器
        </p>
      </section>

      <section class="home__grid">
        <ToolCard v-for="tool in tools" :key="tool.id" :tool="tool" />
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
