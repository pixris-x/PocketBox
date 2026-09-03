<script setup>
// 复选框组件（带 label 插槽）
import UiIcon from '../UiIcon/index.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  disabled: Boolean,
})

const emit = defineEmits(['update:modelValue'])

function onChange(event) {
  emit('update:modelValue', event.target.checked)
}
</script>

<template>
  <label class="ui-checkbox" :class="{ 'is-disabled': disabled }">
    <input
      class="ui-checkbox__input"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="onChange"
    />
    <span class="ui-checkbox__box" aria-hidden="true">
      <UiIcon v-if="modelValue" name="check" :size="12" />
    </span>
    <span v-if="$slots.default" class="ui-checkbox__label"><slot /></span>
  </label>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
