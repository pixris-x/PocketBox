<script setup>
// 首页工具卡片
// 描述固定两行（超出截断、不足补位）保证网格内卡片等高；标签只参与搜索不占版面
defineProps({
  tool: { type: Object, required: true },
})
</script>

<template>
  <router-link :to="tool.path" class="tool-card">
    <div class="tool-card__head">
      <span class="tool-card__icon">
        <UiIcon :name="tool.icon" :size="20" />
      </span>
      <UiIcon class="tool-card__arrow" name="arrow-right" :size="16" />
    </div>
    <h3 class="tool-card__title">{{ tool.title }}</h3>
    <p class="tool-card__desc">{{ tool.description }}</p>
  </router-link>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
