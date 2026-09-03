<script setup>
// 滑块组件（min/max/step，showValue 显示当前值）
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  disabled: Boolean,
  showValue: Boolean,
})

const emit = defineEmits(['update:modelValue'])

const percent = computed(() => {
  const range = props.max - props.min
  if (range <= 0) return 0
  return ((props.modelValue - props.min) / range) * 100
})

function onInput(event) {
  emit('update:modelValue', Number(event.target.value))
}
</script>

<template>
  <div class="ui-slider" :class="{ 'is-disabled': disabled }">
    <input
      class="ui-slider__input"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :disabled="disabled"
      :style="{ '--fill': percent + '%' }"
      @input="onInput"
    />
    <span v-if="showValue" class="ui-slider__value mono">{{ modelValue }}</span>
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
