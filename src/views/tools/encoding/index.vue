<script setup>
// 合并页容器：UiTabs 切换子面板，当前 Tab 同步到 URL query（可分享 / 刷新保留 / 承接旧链接重定向）
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ToolShell from '@/components/ToolShell/index.vue'
import Base64Panel from './components/Base64Panel/index.vue'
import UrlPanel from './components/UrlPanel/index.vue'

const TABS = [
  { label: 'Base64', value: 'base64' },
  { label: 'URL 编解码', value: 'url' },
]

const PANELS = {
  base64: Base64Panel,
  url: UrlPanel,
}

const DEFAULT_TAB = 'base64'

const route = useRoute()
const router = useRouter()

function pickTab(value) {
  const tab = typeof value === 'string' ? value : ''
  return tab in PANELS ? tab : DEFAULT_TAB
}

const active = ref(pickTab(route.query.tab))
const panel = computed(() => PANELS[active.value])

// 地址栏直接改 ?tab= 或从旧路径重定向过来时同步状态
watch(
  () => route.query.tab,
  (value) => {
    active.value = pickTab(value)
  }
)

function onChange(value) {
  // replace 而非 push：切 Tab 不该产生大量历史记录
  router.replace({ query: { ...route.query, tab: value } })
}
</script>

<template>
  <ToolShell
    title="文本编解码"
    description="Base64 与 URL 的编码解码，支持文本与文件、Unicode 安全，兼容查询串中的 + 号。"
  >
    <UiCard>
      <UiSection title="功能">
        <UiTabs v-model="active" :tabs="TABS" @update:model-value="onChange" />
      </UiSection>
    </UiCard>

    <component :is="panel" />
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
