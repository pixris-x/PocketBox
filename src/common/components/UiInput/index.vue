<script setup>
// 单行输入框组件
// 支持 clearable 清空、prefix/suffix 插槽
import { ref } from 'vue'
import UiIcon from '../UiIcon/index.vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  disabled: Boolean,
  clearable: Boolean,
  maxlength: { type: Number, default: undefined },
})

const emit = defineEmits(['update:modelValue'])
const focused = ref(false)

function onInput(event) {
  emit('update:modelValue', event.target.value)
}

function clear() {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="ui-input" :class="{ 'is-focus': focused, 'is-disabled': disabled }">
    <slot name="prefix" />
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      :spellcheck="false"
      @input="onInput"
      @focus="focused = true"
      @blur="focused = false"
    />
    <button
      v-if="clearable && modelValue !== '' && modelValue !== null && !disabled"
      class="ui-input__clear"
      type="button"
      tabindex="-1"
      aria-label="清空"
      @click="clear"
    >
      <UiIcon name="close" :size="14" />
    </button>
    <slot name="suffix" />
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
