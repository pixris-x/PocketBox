<script setup>
// 标签页组件
// tabs: [{ label, value }]；modelValue 为当前激活 value
defineProps({
  modelValue: { type: [String, Number], default: '' },
  tabs: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="ui-tabs" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.value"
      class="ui-tabs__item"
      :class="{ 'is-active': modelValue === tab.value }"
      @click="emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
