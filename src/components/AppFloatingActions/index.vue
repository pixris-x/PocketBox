<script setup>
// 右下角悬浮操作按钮：主题切换 + 返回顶部
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useTheme } from '@/common/utils/theme'

const { isDark, toggle } = useTheme()

const SCROLL_THRESHOLD = 150
const showBackTop = ref(false)

function onScroll() {
  showBackTop.value = window.scrollY > SCROLL_THRESHOLD
}

function backToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <div class="fab-actions">
    <button
      type="button"
      class="fab fab--top"
      :class="{ 'is-visible': showBackTop }"
      aria-label="返回顶部"
      title="返回顶部"
      @click="backToTop"
    >
      <UiIcon name="chevron-up" :size="20" />
    </button>
    <button
      type="button"
      class="fab fab--theme"
      :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
      :title="isDark ? '浅色模式' : '深色模式'"
      @click="toggle"
    >
      <UiIcon :name="isDark ? 'sun' : 'moon'" :size="20" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
