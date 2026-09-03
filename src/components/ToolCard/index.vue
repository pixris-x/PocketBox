<script setup>
// 首页工具卡片
defineProps({
  tool: { type: Object, required: true },
})
</script>

<template>
  <router-link :to="tool.path" class="tool-card">
    <div class="tool-card__head">
      <span class="tool-card__icon">
        <UiIcon :name="tool.icon" :size="22" />
      </span>
      <UiIcon class="tool-card__arrow" name="arrow-right" :size="16" />
    </div>
    <h3 class="tool-card__title">{{ tool.title }}</h3>
    <p class="tool-card__desc">{{ tool.description }}</p>
    <div v-if="tool.tags?.length" class="tool-card__tags">
      <UiTag v-for="tag in tool.tags" :key="tag" variant="primary">{{ tag }}</UiTag>
    </div>
  </router-link>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
