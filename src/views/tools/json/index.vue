<script setup>
// 合并页容器：UiTabs 切换子面板，当前 Tab 同步到 URL query（可分享 / 刷新保留 / 承接旧链接重定向）
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ToolShell from '@/components/ToolShell/index.vue'
import JsonPanel from './components/JsonPanel/index.vue'
import CsvPanel from './components/CsvPanel/index.vue'
import XmlPanel from './components/XmlPanel/index.vue'
import YamlPanel from './components/YamlPanel/index.vue'

const TABS = [
  { label: 'JSON 格式化', value: 'format' },
  { label: 'CSV ↔ JSON', value: 'csv' },
  { label: 'XML ↔ JSON', value: 'xml' },
  { label: 'YAML ↔ JSON', value: 'yaml' },
]

const PANELS = {
  format: JsonPanel,
  csv: CsvPanel,
  xml: XmlPanel,
  yaml: YamlPanel,
}

const DEFAULT_TAB = 'format'

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
    title="JSON 工具箱"
    description="JSON 格式化 / 压缩 / 校验与层级树，以及与 CSV、XML、YAML 的双向转换。全部本地完成。"
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
