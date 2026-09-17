<script setup>
// PDF 合并 / 拆分：pdf-lib 本地处理，文件不出浏览器
import { ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { downloadBlob } from '@/common/utils/download'
import { formatBytes } from '@/common/utils/format'
import { useToast } from '@/common/utils/toast'
import { extractPdfPages, getPdfPageCount, mergePdfs } from '@/common/utils/pdf-tool'

const TABS = [
  { label: '合并 PDF', value: 'merge' },
  { label: '拆分 / 提取页面', value: 'split' },
]

const toast = useToast()
const mode = ref('merge')

// 合并
const mergeFiles = ref([])
const merging = ref(false)

// 拆分
const splitFile = ref(null)
const splitPageCount = ref(0)
const rangesText = ref('1')
const splitting = ref(false)

function isPdf(file) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

async function onMergeFiles(files) {
  const pdfs = files.filter(isPdf)
  if (pdfs.length === 0) {
    toast.error('请选择 PDF 文件')
    return
  }
  mergeFiles.value.push(...pdfs)
}

function removeMergeFile(index) {
  mergeFiles.value.splice(index, 1)
}

async function onMerge() {
  if (mergeFiles.value.length < 2) {
    toast.error('至少选择两个 PDF 才能合并')
    return
  }
  merging.value = true
  try {
    const buffers = await Promise.all(mergeFiles.value.map((f) => f.arrayBuffer()))
    const merged = await mergePdfs(buffers)
    downloadBlob(new Blob([merged], { type: 'application/pdf' }), 'merged.pdf')
    toast.success(`已合并 ${mergeFiles.value.length} 个文件`)
  } catch (err) {
    toast.error(
      err?.message?.includes('加密') ? '包含加密或损坏的 PDF，无法处理' : '合并失败，请检查文件'
    )
  } finally {
    merging.value = false
  }
}

async function onSplitFile(files) {
  const file = files.find(isPdf)
  if (!file) {
    toast.error('请选择 PDF 文件')
    return
  }
  splitFile.value = file
  try {
    splitPageCount.value = await getPdfPageCount(await file.arrayBuffer())
    rangesText.value = `1-${Math.min(splitPageCount.value, 3)}`
  } catch {
    splitFile.value = null
    toast.error('无法读取该 PDF（可能已加密或损坏）')
  }
}

async function onSplit() {
  if (!splitFile.value || splitting.value) return
  splitting.value = true
  try {
    const extracted = await extractPdfPages(await splitFile.value.arrayBuffer(), rangesText.value)
    const base = splitFile.value.name.replace(/\.pdf$/i, '')
    downloadBlob(new Blob([extracted], { type: 'application/pdf' }), `${base}-pages.pdf`)
    toast.success('已导出所选页面')
  } catch (err) {
    toast.error(err.message || '提取失败')
  } finally {
    splitting.value = false
  }
}
</script>

<template>
  <ToolShell
    title="PDF 合并 / 拆分"
    description="多个 PDF 合并为一个，或按页码区间提取页面生成新 PDF。基于 pdf-lib 在本地处理，文件不上传。"
  >
    <UiCard>
      <UiSection title="模式">
        <UiTabs v-model="mode" :tabs="TABS" />
      </UiSection>

      <UiSection v-if="mode === 'merge'" title="选择要合并的 PDF">
        <UiDropzone
          accept="application/pdf,.pdf"
          multiple
          title="点击或拖拽 PDF 到此处（可多选）"
          hint="按下方列表顺序合并，可反复追加"
          @files="onMergeFiles"
        />
        <ol v-if="mergeFiles.length" class="pdftool__files">
          <li v-for="(file, index) in mergeFiles" :key="file.name + index" class="pdftool__file">
            <span class="pdftool__order">{{ index + 1 }}</span>
            <span class="pdftool__name">{{ file.name }}</span>
            <span class="pdftool__size">{{ formatBytes(file.size) }}</span>
            <UiButton variant="ghost" size="sm" @click="removeMergeFile(index)">
              <UiIcon name="close" :size="14" />
              移除
            </UiButton>
          </li>
        </ol>
        <div class="pdftool__row">
          <UiButton size="sm" :loading="merging" :disabled="mergeFiles.length < 2" @click="onMerge">
            <UiIcon name="download" :size="14" />
            合并并下载（{{ mergeFiles.length }} 个文件）
          </UiButton>
        </div>
      </UiSection>

      <UiSection v-else title="选择要拆分的 PDF">
        <UiDropzone
          accept="application/pdf,.pdf"
          title="点击或拖拽单个 PDF 到此处"
          hint="加密 PDF 无法处理"
          @files="onSplitFile"
        />
        <div v-if="splitFile" class="pdftool__file pdftool__file--single">
          <span class="pdftool__name">{{ splitFile.name }}</span>
          <span class="pdftool__size">共 {{ splitPageCount }} 页</span>
        </div>
        <div v-if="splitFile" class="pdftool__options">
          <label class="pdftool__field">
            <span class="pdftool__label">页码区间（1 起始，含端点，如 1-3,5）</span>
            <UiInput v-model="rangesText" placeholder="例如 1-3,5" />
          </label>
          <UiButton size="sm" :loading="splitting" @click="onSplit">
            <UiIcon name="download" :size="14" />
            提取并下载
          </UiButton>
        </div>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
