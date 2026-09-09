<script setup>
// 右下角悬浮按钮：返回顶部（主题切换入口在 AppHeader）
import { onBeforeUnmount, onMounted, ref } from 'vue'

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
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
