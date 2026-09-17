<script setup>
// 拖拽 / 点选上传区（公共组件）
// 统一通过 files 事件抛出 File[]；单选 / 多选由 multiple 控制，过滤规则由 accept 控制
import { ref } from 'vue'

defineProps({
  accept: { type: String, default: 'image/*' },
  multiple: { type: Boolean, default: false },
  title: { type: String, default: '点击选择文件，或拖拽到此处' },
  hint: { type: String, default: '' },
})

const emit = defineEmits(['files'])

const inputRef = ref(null)
const dragging = ref(false)

function pick() {
  inputRef.value?.click()
}

function onChange(event) {
  const files = Array.from(event.target.files || [])
  if (files.length) emit('files', files)
  event.target.value = ''
}

function onDrop(event) {
  dragging.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  if (files.length) emit('files', files)
}

function onDragOver(event) {
  event.preventDefault()
  dragging.value = true
}

function onDragLeave() {
  dragging.value = false
}
</script>

<template>
  <div
    class="ui-dropzone"
    :class="{ 'is-dragging': dragging }"
    role="button"
    tabindex="0"
    @click="pick"
    @keydown.enter="pick"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <input
      ref="inputRef"
      type="file"
      :accept="accept"
      :multiple="multiple"
      hidden
      @change="onChange"
    />
    <span class="ui-dropzone__icon">
      <UiIcon name="upload" :size="24" />
    </span>
    <p class="ui-dropzone__title">{{ title }}</p>
    <p v-if="hint" class="ui-dropzone__hint">{{ hint }}</p>
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
