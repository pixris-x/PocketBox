<script setup>
// 新版本提示条：Service Worker 更新并接管后出现，由用户决定何时刷新
import { updateReady } from '@/common/utils/sw'

function reload() {
  window.location.reload()
}

function dismiss() {
  updateReady.value = false
}
</script>

<template>
  <div v-if="updateReady" class="update-prompt" role="status">
    <UiIcon class="update-prompt__icon" name="refresh" :size="16" />
    <span class="update-prompt__text">已更新到新版本</span>
    <UiButton size="sm" @click="reload">立即刷新</UiButton>
    <UiButton variant="ghost" size="sm" aria-label="稍后再说" @click="dismiss">
      <UiIcon name="close" :size="14" />
    </UiButton>
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
