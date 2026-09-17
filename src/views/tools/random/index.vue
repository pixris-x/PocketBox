<script setup>
// 合并页容器：UiTabs 切换子面板，当前 Tab 同步到 URL query（可分享 / 刷新保留 / 承接旧链接重定向）
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ToolShell from '@/components/ToolShell/index.vue'
import UuidPanel from './components/UuidPanel/index.vue'
import PasswordPanel from './components/PasswordPanel/index.vue'
import FakeTextPanel from './components/FakeTextPanel/index.vue'

const TABS = [
  { label: 'UUID', value: 'uuid' },
  { label: '密码', value: 'password' },
  { label: '中文假文', value: 'fake-text' },
]

const PANELS = {
  uuid: UuidPanel,
  password: PasswordPanel,
  'fake-text': FakeTextPanel,
}

const DEFAULT_TAB = 'uuid'

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
    title="随机生成器"
    description="批量生成 UUID v4、强密码与中文假文，随机源来自 Web Crypto，全部本地生成。"
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
