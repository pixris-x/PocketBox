<script setup>
// 区块组件：标题 + 描述 + 可选 extra 插槽（右侧操作区）
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  spaced: { type: Boolean, default: true },
})
</script>

<template>
  <section class="ui-section" :class="{ 'is-spaced': spaced }">
    <header v-if="title || description || $slots.extra" class="ui-section__header">
      <div class="ui-section__text">
        <h3 v-if="title" class="ui-section__title">{{ title }}</h3>
        <p v-if="description" class="ui-section__desc">{{ description }}</p>
      </div>
      <slot name="extra" />
    </header>
    <slot />
  </section>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
