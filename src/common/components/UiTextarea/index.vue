<script setup>
// 多行文本域组件
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  rows: { type: Number, default: 5 },
  disabled: Boolean,
  mono: Boolean,
})

const emit = defineEmits(['update:modelValue'])

function onInput(event) {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div class="ui-textarea" :class="{ 'is-disabled': disabled, 'is-mono': mono }">
    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :disabled="disabled"
      :spellcheck="false"
      @input="onInput"
    />
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
