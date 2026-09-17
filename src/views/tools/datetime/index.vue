<script setup>
// 合并页容器：UiTabs 切换子面板，当前 Tab 同步到 URL query（可分享 / 刷新保留 / 承接旧链接重定向）
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ToolShell from '@/components/ToolShell/index.vue'
import TimestampPanel from './components/TimestampPanel/index.vue'
import DateCalcPanel from './components/DateCalcPanel/index.vue'
import CronPanel from './components/CronPanel/index.vue'

const TABS = [
  { label: '时间戳', value: 'timestamp' },
  { label: '日期计算', value: 'date-calc' },
  { label: 'Cron 解析', value: 'cron' },
]

const PANELS = {
  timestamp: TimestampPanel,
  'date-calc': DateCalcPanel,
  cron: CronPanel,
}

const DEFAULT_TAB = 'timestamp'

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
    title="时间工具箱"
    description="Unix 时间戳换算、日期间隔与加减计算、Cron 表达式解析与执行时间预测。全部本地完成。"
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
