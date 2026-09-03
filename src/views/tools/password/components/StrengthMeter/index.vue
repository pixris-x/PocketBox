<script setup>
// 密码强度指示条（页面私有组件）
import { computed } from 'vue'
import { strengthOf } from '../../scripts/generator'

const props = defineProps({
  bits: { type: Number, default: 0 },
})

const strength = computed(() => strengthOf(props.bits))
</script>

<template>
  <div class="strength-meter">
    <div class="strength-meter__track">
      <div class="strength-meter__fill" :class="`is-level-${strength.level}`" :style="{ width: Math.min(100, (bits / 128) * 100) + '%' }" />
    </div>
    <span class="strength-meter__label" :class="`is-level-${strength.level}`">
      {{ strength.label }}（约 {{ Math.round(bits) }} 位熵）
    </span>
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
