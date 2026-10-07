<script setup>
// 合并页容器：UiTabs 切换子面板，当前 Tab 同步到 URL query（可分享 / 刷新保留）
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ToolShell from '@/components/ToolShell/index.vue'
import VerifyPanel from './components/VerifyPanel/index.vue'
import MaskPanel from './components/MaskPanel/index.vue'

const TABS = [
  { label: '号码校验', value: 'verify' },
  { label: '信息脱敏', value: 'mask' },
]

const PANELS = {
  verify: VerifyPanel,
  mask: MaskPanel,
}

const DEFAULT_TAB = 'verify'

const route = useRoute()
const router = useRouter()

function pickTab(value) {
  const tab = typeof value === 'string' ? value : ''
  return tab in PANELS ? tab : DEFAULT_TAB
}

const active = ref(pickTab(route.query.tab))
const panel = computed(() => PANELS[active.value])

// 地址栏直接改 ?tab= 时同步状态
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
    title="证件与信息校验"
    description="身份证、银行卡与手机号的格式与校验位校验，以及手机号、证件、姓名、邮箱等敏感信息脱敏。全部在浏览器本地计算，不上传、不留存。"
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
