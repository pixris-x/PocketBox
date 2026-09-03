<script setup>
// 拖拽 / 点选上传区（页面私有组件）
import { ref } from 'vue'

const props = defineProps({
  accept: { type: String, default: 'image/*' },
  multiple: { type: Boolean, default: true },
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
  const images = files.filter((file) => file.type.startsWith('image/'))
  if (images.length) emit('files', images)
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
    <input ref="inputRef" type="file" :accept="accept" :multiple="multiple" hidden @change="onChange" />
    <span class="dropzone__icon">
      <UiIcon name="upload" :size="24" />
    </span>
    <p class="dropzone__title">点击选择图片，或拖拽图片到此处</p>
    <p class="dropzone__hint">支持 PNG / JPG / WebP / BMP / GIF 等浏览器可解码的格式，可多选</p>
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
