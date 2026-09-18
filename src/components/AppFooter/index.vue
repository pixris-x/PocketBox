<script setup>
// 站点底部栏：隐私口径文案。桌面端多一条 GitHub 更新源说明，
// 因为 electron-updater 确实会向第三方发起请求（口径约束见 AGENTS.md §7.1）。
import { isDesktop } from '@/common/utils/desktop'

const notices = ['数据不外发给第三方，IP 归属地查询由本站服务端提供']
if (isDesktop()) notices.push('版本更新由 GitHub Releases 分发')
const noticeText = `口袋工具箱 · ${notices.join(' · ')}`
</script>

<template>
  <footer class="app-footer">
    <div class="container app-footer__inner">
      <p class="app-footer__text">{{ noticeText }}</p>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
