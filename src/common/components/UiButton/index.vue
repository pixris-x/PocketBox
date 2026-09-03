<script setup>
// 按钮组件
// variant: primary | secondary | ghost | danger
// size:    sm | md | lg
import { computed } from 'vue'

const props = defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  type: { type: String, default: 'button' },
  block: Boolean,
  loading: Boolean,
  disabled: Boolean,
})

const emit = defineEmits(['click'])

const classes = computed(() => [
  'ui-btn',
  `ui-btn--${props.variant}`,
  `ui-btn--${props.size}`,
  { 'ui-btn--block': props.block, 'ui-btn--loading': props.loading, 'is-disabled': props.disabled },
])

function onClick(event) {
  if (!props.disabled && !props.loading) emit('click', event)
}
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled || loading" @click="onClick">
    <span v-if="loading" class="ui-btn__spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
