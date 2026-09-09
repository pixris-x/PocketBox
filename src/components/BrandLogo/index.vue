<script setup>
// 站点品牌标识：2x2 方块网格（多工具集合）+ 右下角品牌色强调块
// 颜色全部取主题 token，明暗与配色切换时自动跟随：
//   底色 --color-text（亮色深 / 暗色浅）、方块 --color-surface、强调块 --color-primary
defineProps({
  size: { type: Number, default: 30 },
})
</script>

<template>
  <svg
    class="brand-logo"
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    role="img"
    aria-label="口袋工具箱"
  >
    <rect width="32" height="32" rx="8" fill="var(--color-text)" />
    <rect x="6.5" y="6.5" width="8" height="8" rx="2.5" fill="var(--color-surface)" />
    <rect x="17.5" y="6.5" width="8" height="8" rx="2.5" fill="var(--color-surface)" />
    <rect x="6.5" y="17.5" width="8" height="8" rx="2.5" fill="var(--color-surface)" />
    <rect x="17.5" y="17.5" width="8" height="8" rx="2.5" fill="var(--color-primary)" />
  </svg>
</template>

<style lang="scss" scoped>
.brand-logo {
  display: block;
  flex-shrink: 0;
  border-radius: var(--radius-md);
}
</style>
