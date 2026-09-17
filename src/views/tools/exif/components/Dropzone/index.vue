<script setup>
// 拖拽 / 点选上传区（页面私有组件，单文件版）
import { ref } from 'vue'

const emit = defineEmits(['file'])

const inputRef = ref(null)
const dragging = ref(false)

function pick() {
  inputRef.value?.click()
}

function onChange(event) {
  const file = event.target.files?.[0]
  if (file) emit('file', file)
  event.target.value = ''
}

function onDrop(event) {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) emit('file', file)
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
    class="dropzone"
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
      accept="image/jpeg,image/png,image/webp"
      hidden
      @change="onChange"
    />
    <span class="dropzone__icon">
      <UiIcon name="upload" :size="24" />
    </span>
    <p class="dropzone__title">点击选择照片，或拖拽到此处</p>
    <p class="dropzone__hint">支持 JPG / PNG / WebP，解析与清除全部在本地完成，图片不会上传</p>
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
