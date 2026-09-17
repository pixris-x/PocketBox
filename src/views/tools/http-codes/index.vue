<script setup>
// HTTP 状态码 / MIME 速查：静态数据 + 搜索过滤，无计算逻辑
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { MIME_TYPES, STATUS_CODES } from './scripts/http-data'

const TABS = [
  { label: 'HTTP 状态码', value: 'status' },
  { label: 'MIME 类型', value: 'mime' },
]
const activeTab = ref('status')
const keyword = ref('')

const statusRows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return STATUS_CODES.filter((row) => {
    if (!kw) return true
    return (
      String(row.code).includes(kw) ||
      row.name.toLowerCase().includes(kw) ||
      row.desc.toLowerCase().includes(kw)
    )
  })
})

const mimeRows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return MIME_TYPES
  return MIME_TYPES.filter(
    (row) =>
      row.type.toLowerCase().includes(kw) ||
      row.ext.toLowerCase().includes(kw) ||
      row.desc.toLowerCase().includes(kw)
  )
})
</script>

<template>
  <ToolShell
    title="HTTP 状态码 / MIME 速查"
    description="常用 HTTP 状态码与 MIME 类型对照表，支持按代码、名称、说明关键词过滤。纯静态数据，本地查询。"
  >
    <UiCard>
      <UiSection title="查询">
        <UiTabs v-model="activeTab" :tabs="TABS" />
        <div class="httpcodes__search">
          <UiInput v-model="keyword" placeholder="输入关键词过滤，如 404、json、图片" />
        </div>
      </UiSection>
    </UiCard>

    <UiCard>
      <UiSection v-if="activeTab === 'status'" title="状态码">
        <div class="httpcodes__table-wrap">
          <table class="httpcodes__table">
            <thead>
              <tr>
                <th>代码</th>
                <th>名称</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in statusRows" :key="row.code">
                <td>
                  <code>{{ row.code }}</code>
                </td>
                <td>
                  <span class="httpcodes__name">{{ row.name }}</span>
                  <UiTag variant="neutral" class="httpcodes__group">{{ row.group }}</UiTag>
                </td>
                <td>{{ row.desc }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="statusRows.length === 0" class="httpcodes__empty">没有匹配的状态码。</p>
        </div>
      </UiSection>

      <UiSection v-else title="MIME 类型">
        <div class="httpcodes__table-wrap">
          <table class="httpcodes__table">
            <thead>
              <tr>
                <th>Content-Type</th>
                <th>扩展名</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in mimeRows" :key="row.type">
                <td>
                  <code>{{ row.type }}</code>
                </td>
                <td>
                  <code>{{ row.ext }}</code>
                </td>
                <td>{{ row.desc }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="mimeRows.length === 0" class="httpcodes__empty">没有匹配的 MIME 类型。</p>
        </div>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
