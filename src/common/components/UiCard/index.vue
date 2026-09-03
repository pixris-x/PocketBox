<script setup>
// 卡片容器组件：header / default / footer 三个插槽
defineProps({
  padding: { type: Boolean, default: true },
})
</script>

<template>
  <div class="ui-card" :class="{ 'is-padded': padding }">
    <slot name="header" />
    <slot />
    <slot name="footer" />
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
