<script setup>
// 首页：hero + 搜索 / 分类筛选 + 工具卡片网格（数据源 data/tools.js）
// 无关键词时按分类分组渲染，每组顶部带小标题；有搜索时扁平聚合
// 筛选条件存 sessionStorage；滚动位置按「锚点」（视口顶部的分组）恢复，
// 因为返回时内容高度会变（最近使用区块出现等），像素坐标不可靠。
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { tools, categories } from '@/data/tools'
import ToolCard from '@/components/ToolCard/index.vue'
import BrandLogo from '@/components/BrandLogo/index.vue'
import {
  clearHomeAnchor,
  clearRecentTools,
  consumeHomeNavigation,
  pickAnchor,
  readHomeAnchor,
  readHomeFilter,
  readRecentTools,
  saveHomeAnchor,
  saveHomeFilter,
} from '@/common/utils/home-state'

// 视口顶部判定线：锚点 top 小于它才算「已经在视口内」
const ANCHOR_THRESHOLD = 12

const storedFilter = readHomeFilter()
const keyword = ref(storedFilter.keyword)
const activeCategory = ref(storedFilter.category)

watch([keyword, activeCategory], ([kw, category]) => {
  saveHomeFilter({ keyword: kw, category })
})

const tabs = [
  { label: '全部', value: 'all' },
  ...categories.map((item) => ({ label: item.label, value: item.id })),
]

const trimmedKeyword = computed(() => keyword.value.trim())
const isSearching = computed(() => trimmedKeyword.value !== '')

// 最近使用：id → 工具对象（数据源里已删除的 id 自动忽略）
const recentIds = ref(readRecentTools())
const recentTools = computed(() =>
  recentIds.value.map((id) => tools.find((tool) => tool.id === id)).filter(Boolean)
)

function onClearRecent() {
  clearRecentTools()
  recentIds.value = []
}

/** 离开首页时记下视口顶部的分组锚点，返回时据此精确恢复。
 *  用布局位置而非 getBoundingClientRect：卸载时常值离场动画中，rect 会带上位移。 */
function rememberScrollAnchor() {
  const scrollY = window.scrollY
  const candidates = Array.from(document.querySelectorAll('[data-anchor]')).map((el) => ({
    anchor: el.getAttribute('data-anchor'),
    top: layoutTop(el) - scrollY,
  }))
  saveHomeAnchor(pickAnchor(candidates, ANCHOR_THRESHOLD))
}

/** 元素的布局位置（累加 offsetTop）：不受入场过渡的 transform 影响 */
function layoutTop(element) {
  let top = 0
  let node = element
  while (node) {
    top += node.offsetTop
    node = node.offsetParent
  }
  return top
}

/** 返回首页时恢复：只有浏览器返回/前进才用锚点，站内导航回到顶部 */
function restoreScroll() {
  let prepared = false
  let saved = null
  let frames = 0
  let lastHeight = -1
  let stableFrames = 0

  const tick = () => {
    if (!prepared) {
      // 放在第一帧读取：确保 router.afterEach 已写入本次导航来源标记
      saved = consumeHomeNavigation() ? readHomeAnchor() : null
      clearHomeAnchor()
      prepared = true
    }

    const height = document.documentElement.scrollHeight
    stableFrames = height === lastHeight ? stableFrames + 1 : 0
    lastHeight = height
    frames++
    if ((frames > 3 && stableFrames >= 2) || frames > 30) {
      const target = saved ? document.querySelector(`[data-anchor="${saved.anchor}"]`) : null
      if (!target) {
        // 站内导航进入、或锚点元素已消失（如最近使用被清空）：回顶部
        window.scrollTo({ top: 0 })
        return
      }
      window.scrollTo({ top: Math.max(0, layoutTop(target) - saved.offset) })
      return
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

onMounted(restoreScroll)
onBeforeUnmount(rememberScrollAnchor)

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

      <!-- 浏览态：最近使用置顶（搜索与分类筛选时隐藏，避免干扰） -->
      <section
        v-if="!isSearching && activeCategory === 'all' && recentTools.length"
        class="home__recent"
        data-anchor="recent"
      >
        <div class="home__recent-head">
          <h2 class="home__group-title home__group-title--recent">
            <span class="home__group-name">最近使用</span>
          </h2>
          <UiButton variant="ghost" size="sm" @click="onClearRecent">
            <UiIcon name="close" :size="14" />
            清除
          </UiButton>
        </div>
        <div class="home__grid">
          <ToolCard v-for="tool in recentTools" :key="`recent-${tool.id}`" :tool="tool" />
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
        <section
          v-for="group in groupedTools"
          :key="group.id"
          class="home__group"
          :data-anchor="`group-${group.id}`"
        >
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
