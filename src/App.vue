<script setup>
import AppFooter from './components/AppFooter/index.vue'
import AppFloatingActions from './components/AppFloatingActions/index.vue'
</script>

<template>
  <div class="app-shell">
    <main class="app-main">
      <router-view />
    </main>
    <AppFooter />
    <AppFloatingActions />
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
</style>
