<script setup>
// 图标组件：UI 库内统一样式入口，name 见 icons.js
import { computed } from 'vue'
import { ICON_PATHS } from './icons'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
})

const inner = computed(() => ICON_PATHS[props.name] || '')
</script>

<template>
  <svg
    class="ui-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="inner"
  />
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
