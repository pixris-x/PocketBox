<script setup>
// 首页：hero + 搜索 / 分类筛选 + 工具卡片网格（数据源 data/tools.js）
// 无关键词时按分类分组渲染，每组顶部带小标题；有搜索时扁平聚合
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

const trimmedKeyword = computed(() => keyword.value.trim())
const isSearching = computed(() => trimmedKeyword.value !== '')

// 搜索匹配的扁平列表（搜索态用）
const searchedTools = computed(() => {
  const kw = trimmedKeyword.value.toLowerCase()
  return tools.filter((tool) => {
    if (activeCategory.value !== 'all' && tool.category !== activeCategory.value) return false
    if (!kw) return true
    return [tool.title, tool.description, tool.id, ...(tool.tags || [])].some((field) =>
      field.toLowerCase().includes(kw)
    )
  })
})

// 浏览态分组：按 categories 顺序，过滤后去掉空组
const groupedTools = computed(() => {
  const kw = trimmedKeyword.value.toLowerCase()
  return categories
    .map((cat) => {
      const items = tools.filter((tool) => {
        if (tool.category !== cat.id) return false
        if (activeCategory.value !== 'all' && tool.category !== activeCategory.value) return false
        if (!kw) return true
        return [tool.title, tool.description, tool.id, ...(tool.tags || [])].some((field) =>
          field.toLowerCase().includes(kw)
        )
      })
      return { id: cat.id, label: cat.label, items }
    })
    .filter((group) => group.items.length > 0)
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
          常用开发与生活小工具集合 · 计算在浏览器本地完成，数据不外发给第三方（IP
          归属地由本站服务端查询）
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

      <!-- 搜索态：扁平聚合 + 计数 -->
      <template v-if="isSearching">
        <p v-if="searchedTools.length" class="home__result" aria-live="polite">
          找到 {{ searchedTools.length }} 个工具
        </p>
        <section v-if="searchedTools.length" class="home__grid">
          <ToolCard v-for="tool in searchedTools" :key="tool.id" :tool="tool" />
        </section>
        <section v-else class="home__empty">
          <UiIcon name="search" :size="28" />
          <p class="home__empty-title">没有匹配的工具</p>
          <p class="home__empty-desc">换个关键词，或清除筛选条件看看全部工具</p>
          <UiButton variant="secondary" size="sm" @click="resetFilter">清除筛选</UiButton>
        </section>
      </template>

      <!-- 浏览态：按分类分组，每组前加标题 -->
      <template v-else>
        <section v-for="group in groupedTools" :key="group.id" class="home__group">
          <h2 class="home__group-title">
            <span class="home__group-name">{{ group.label }}</span>
            <span class="home__group-count">{{ group.items.length }}</span>
          </h2>
          <div class="home__grid">
            <ToolCard v-for="tool in group.items" :key="tool.id" :tool="tool" />
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
