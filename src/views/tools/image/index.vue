<script setup>
// 合并页容器：UiTabs 切换子面板，当前 Tab 同步到 URL query（可分享 / 刷新保留 / 承接旧链接重定向）
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ToolShell from '@/components/ToolShell/index.vue'
import ConvertPanel from './components/ConvertPanel/index.vue'
import FaviconPanel from './components/FaviconPanel/index.vue'
import ExifPanel from './components/ExifPanel/index.vue'

const TABS = [
  { label: '格式转换', value: 'convert' },
  { label: 'Favicon', value: 'favicon' },
  { label: 'EXIF 元数据', value: 'exif' },
]

const PANELS = {
  convert: ConvertPanel,
  favicon: FaviconPanel,
  exif: ExifPanel,
}

const DEFAULT_TAB = 'convert'

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
    title="图片工具箱"
    description="格式转换与缩放、Favicon 多尺寸导出、EXIF 元数据查看与清除。图片不上传，全部本地处理。"
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
