<script setup>
// 分割线组件
defineProps({
  vertical: Boolean,
})
</script>

<template>
  <div class="ui-divider" :class="{ 'is-vertical': vertical }" role="separator" />
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
