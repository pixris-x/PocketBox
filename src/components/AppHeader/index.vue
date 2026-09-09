<script setup>
// 站点顶栏：品牌（回首页）+ 配色选择 + 明暗切换
import { useTheme } from '@/common/utils/theme'

const { isDark, toggle, accent, setAccent, accents } = useTheme()
</script>

<template>
  <header class="app-header">
    <div class="container app-header__inner">
      <router-link class="app-header__brand" to="/">
        <BrandLogo class="app-header__logo" :size="28" />
        <span class="app-header__title">口袋工具箱</span>
      </router-link>

      <div class="app-header__actions">
        <UiSelect
          class="app-header__accent"
          :model-value="accent"
          :options="accents"
          @update:model-value="setAccent"
        />
        <button
          type="button"
          class="app-header__theme"
          :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
          :title="isDark ? '浅色模式' : '深色模式'"
          @click="toggle"
        >
          <UiIcon :name="isDark ? 'sun' : 'moon'" :size="18" />
        </button>
      </div>
    </div>
  </header>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
