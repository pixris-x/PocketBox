<script setup>
// 标签/徽章组件
// variant: neutral | primary | success | warning | danger | info
defineProps({
  variant: { type: String, default: 'neutral' },
})
</script>

<template>
  <span class="ui-tag" :class="`ui-tag--${variant}`">
    <slot />
  </span>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
