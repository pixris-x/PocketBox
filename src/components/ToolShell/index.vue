<script setup>
// 工具页统一排版外壳：返回链接 + 标题/描述 + 内容区
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="tool-shell">
    <router-link class="tool-shell__back" to="/">
      <UiIcon name="arrow-left" :size="16" />
      <span>返回全部工具</span>
    </router-link>

    <header class="tool-shell__header">
      <h1 class="tool-shell__title">{{ title }}</h1>
      <p v-if="description" class="tool-shell__desc">{{ description }}</p>
    </header>

    <div class="tool-shell__content">
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
