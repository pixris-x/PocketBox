<script setup>
// 首页：hero + 搜索 / 分类筛选 + 工具卡片网格（数据源 data/tools.js）
import { computed, ref } from 'vue'
import { tools, categories } from '@/data/tools'
import ToolCard from '@/components/ToolCard/index.vue'
import BrandLogo from '@/components/BrandLogo/index.vue'

const keyword = ref('')
const activeCategory = ref('all')

const tabs = [
  { label: '全部', value: 'all' },
  ...categories.map((item) => ({ label: item.label, value: item.id })),
]

const isFiltering = computed(() => keyword.value.trim() !== '' || activeCategory.value !== 'all')

const filteredTools = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return tools.filter((tool) => {
    if (activeCategory.value !== 'all' && tool.category !== activeCategory.value) return false
    if (!kw) return true
    return [tool.title, tool.description, tool.id, ...(tool.tags || [])].some((field) =>
      field.toLowerCase().includes(kw)
    )
  })
})

function resetFilter() {
  keyword.value = ''
  activeCategory.value = 'all'
}
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

      <section class="home__toolbar">
        <label class="home__search">
          <span class="home__sr-only">搜索工具</span>
          <UiInput
            v-model="keyword"
            class="home__search-input"
            placeholder="搜索名称、描述或标签"
            clearable
          >
            <template #prefix>
              <UiIcon class="home__search-icon" name="search" :size="15" />
            </template>
          </UiInput>
        </label>

        <div class="home__tabs">
          <UiTabs v-model="activeCategory" :tabs="tabs" />
        </div>
      </section>

      <p v-if="isFiltering && filteredTools.length" class="home__result" aria-live="polite">
        找到 {{ filteredTools.length }} 个工具
      </p>

      <section v-if="filteredTools.length" class="home__grid">
        <ToolCard v-for="tool in filteredTools" :key="tool.id" :tool="tool" />
      </section>

      <section v-else class="home__empty">
        <UiIcon name="search" :size="28" />
        <p class="home__empty-title">没有匹配的工具</p>
        <p class="home__empty-desc">换个关键词，或清除筛选条件看看全部工具</p>
        <UiButton variant="secondary" size="sm" @click="resetFilter">清除筛选</UiButton>
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
