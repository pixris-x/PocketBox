<script setup>
// 开关组件
defineProps({
  modelValue: { type: Boolean, default: false },
  disabled: Boolean,
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    class="ui-switch"
    :class="{ 'is-on': modelValue, 'is-disabled': disabled }"
    :disabled="disabled"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span class="ui-switch__knob" />
  </button>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
