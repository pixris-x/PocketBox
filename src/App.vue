<script setup>
import AppHeader from './components/AppHeader/index.vue'
import AppFooter from './components/AppFooter/index.vue'
import AppFloatingActions from './components/AppFloatingActions/index.vue'
import AppUpdatePrompt from './components/AppUpdatePrompt/index.vue'
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <main class="app-main">
      <!-- 路由过渡：out-in 保证新旧页不重叠（否则高度会跳），动效定义见下方全局样式 -->
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>
    <AppFooter />
    <AppFloatingActions />
    <AppUpdatePrompt />
    <UiToast />
  </div>
</template>

<style lang="scss">
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-main {
  flex: 1;
  width: 100%;
  padding: var(--space-6) 0 var(--space-8);

  .container {
    height: 100%;
  }
}

// ============================================================
// 页面切换动效（全局，所有路由页自动生效）
// 入场略慢、出场更快：切换干脆但不生硬
// ============================================================
.page-enter-active {
  transition:
    opacity 0.24s ease-out,
    transform 0.24s ease-out;
}

.page-leave-active {
  transition:
    opacity 0.12s ease-in,
    transform 0.12s ease-in;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

// 无障碍：系统开启「减少动态效果」时不做位移与淡入
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }

  .page-enter-from,
  .page-leave-to {
    opacity: 1;
    transform: none;
  }
}
</style>
