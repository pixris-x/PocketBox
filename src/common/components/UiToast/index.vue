<script setup>
// 全局 toast 渲染组件（挂在 App.vue 一次）
// 消息源见 common/utils/toast.js 的 toastState
import { toastState } from '@/common/utils/toast'
import UiIcon from '../UiIcon/index.vue'

const ICONS = {
  success: 'check-circle',
  error: 'alert-circle',
  warning: 'alert-triangle',
  info: 'info',
}
</script>

<template>
  <div class="ui-toast-wrap">
    <transition-group name="ui-toast">
      <div
        v-for="item in toastState"
        :key="item.id"
        class="ui-toast"
        :class="`ui-toast--${item.type}`"
      >
        <UiIcon :name="ICONS[item.type] || 'info'" :size="16" />
        <span class="ui-toast__msg">{{ item.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
