<script setup>
// 图片压缩面板：全局参数 + 批量本地压缩（Canvas 有损重编码，图片不出浏览器）
import { computed, reactive, ref, watch } from 'vue'
import { downloadBlob } from '@/common/utils/download'
import { formatBytes } from '@/common/utils/format'
import { useToast } from '@/common/utils/toast'
import { loadImage } from '../../scripts/canvas'
import { COMPRESS_FORMATS, compressImage, outputFilename, sizeChange } from './scripts/compressor'

const settings = reactive({
  format: 'webp',
  quality: 0.8,
  maxWidth: 0,
  fillBg: true,
})

// 宽度上限做成预设：数字输入框容易填进无意义值，而压缩场景要的只是「小一点」
const WIDTH_OPTIONS = [
  { label: '不限制宽度', value: 0 },
  { label: '最长 2560px', value: 2560 },
  { label: '最长 1920px', value: 1920 },
  { label: '最长 1600px', value: 1600 },
  { label: '最长 1280px', value: 1280 },
  { label: '最长 1024px', value: 1024 },
  { label: '最长 800px', value: 800 },
]

const items = ref([])
const toast = useToast()
const busy = ref(false)

const qualityPercent = computed(() => Math.round(settings.quality * 100))
const doneItems = computed(() => items.value.filter((item) => item.result))
const totalOriginal = computed(() => doneItems.value.reduce((sum, item) => sum + item.file.size, 0))
const totalCompressed = computed(() =>
  doneItems.value.reduce((sum, item) => sum + item.result.blob.size, 0)
)
const summary = computed(() => sizeChange(totalOriginal.value, totalCompressed.value))

/** 与 items 同下标的体积变化，避免模板里对同一项重复计算 */
const deltas = computed(() =>
  items.value.map((item) =>
    item.result ? sizeChange(item.file.size, item.result.blob.size) : null
  )
)

async function addFiles(files) {
  const images = files.filter((file) => file.type.startsWith('image/'))
  if (images.length !== files.length) toast.error('已忽略非图片文件')
  for (const file of images) {
    const item = reactive({ file, image: null, objectUrl: '', result: null, error: '' })
    items.value.push(item)
    try {
      const { img, url } = await loadImage(file)
      item.image = img
      item.objectUrl = url
      await runItem(item)
    } catch (err) {
      item.error = err.message
    }
  }
}

async function runItem(item) {
  if (!item.image) return
  try {
    if (item.result?.url) URL.revokeObjectURL(item.result.url)
    const result = await compressImage(item.image, settings)
    result.url = URL.createObjectURL(result.blob)
    item.result = result
    item.error = ''
  } catch (err) {
    item.error = err.message
    item.result = null
  }
}

/** 参数变更后重算全部：本地纯计算，即时反馈比「手动点转换」更顺手 */
async function recompressAll() {
  if (!items.value.length) return
  busy.value = true
  for (const item of items.value) await runItem(item)
  busy.value = false
}

watch(() => [settings.format, settings.quality, settings.maxWidth, settings.fillBg], recompressAll)

function removeItem(index) {
  const [item] = items.value.splice(index, 1)
  if (item.objectUrl) URL.revokeObjectURL(item.objectUrl)
  if (item.result?.url) URL.revokeObjectURL(item.result.url)
}

function clearAll() {
  while (items.value.length) removeItem(0)
}

function downloadItem(item) {
  if (item.result) downloadBlob(item.result.blob, outputFilename(item.file.name, settings.format))
}

function downloadAll() {
  if (!doneItems.value.length) {
    toast.error('还没有可下载的压缩结果')
    return
  }
  doneItems.value.forEach(downloadItem)
  toast.success(`已下载 ${doneItems.value.length} 张`)
}
</script>

<template>
  <UiCard>
    <UiSection title="压缩参数" description="所有图片共用，改动会立即重新压缩已加入的图片">
      <div class="cmp-grid">
        <div class="cmp-field">
          <span class="cmp-field__label">输出格式</span>
          <UiSelect v-model="settings.format" :options="COMPRESS_FORMATS" />
        </div>
        <div class="cmp-field">
          <span class="cmp-field__label">宽度上限</span>
          <UiSelect v-model="settings.maxWidth" :options="WIDTH_OPTIONS" />
        </div>
        <div class="cmp-field cmp-field--wide">
          <span class="cmp-field__label">质量 {{ qualityPercent }}%</span>
          <UiSlider v-model="settings.quality" :min="0.1" :max="0.99" :step="0.01" />
        </div>
      </div>
      <div v-if="settings.format === 'jpeg'" class="cmp-switch">
        <UiSwitch v-model="settings.fillBg" />
        <span class="cmp-switch__text">JPEG 不支持透明，透明区域铺白底</span>
      </div>
    </UiSection>
  </UiCard>

  <UiDropzone
    accept="image/*"
    multiple
    title="点击选择图片，或拖拽到此处"
    hint="支持批量；图片只在浏览器内解码与重编码，不会上传"
    @files="addFiles"
  />

  <div v-if="items.length" class="cmp-bar">
    <span class="cmp-bar__count">
      共 {{ items.length }} 张 · 已压缩 {{ doneItems.length }} 张
      <template v-if="doneItems.length">
        · {{ formatBytes(totalOriginal) }} → {{ formatBytes(totalCompressed) }}
        <b :class="summary.grew ? 'is-grew' : 'is-shrank'">
          {{ summary.grew ? '变大' : '节省' }} {{ summary.percent.toFixed(1) }}%
        </b>
      </template>
    </span>
    <div class="cmp-bar__actions">
      <UiButton variant="secondary" size="sm" :disabled="busy" @click="recompressAll">
        <UiIcon name="refresh" :size="14" />
        全部重压
      </UiButton>
      <UiButton variant="secondary" size="sm" @click="downloadAll">
        <UiIcon name="download" :size="14" />
        全部下载
      </UiButton>
      <UiButton variant="ghost" size="sm" @click="clearAll">
        <UiIcon name="close" :size="14" />
        清空
      </UiButton>
    </div>
  </div>

  <div v-if="items.length" class="cmp-list">
    <UiCard v-for="(item, index) in items" :key="item.file.name + index" class="cmp-item">
      <div class="cmp-item__head">
        <span class="cmp-item__name">{{ item.file.name }}</span>
        <UiButton variant="ghost" size="sm" @click="removeItem(index)">
          <UiIcon name="close" :size="14" />
          移除
        </UiButton>
      </div>

      <p v-if="item.error" class="cmp-item__error">{{ item.error }}</p>

      <div v-else-if="item.result" class="cmp-item__body">
        <img class="cmp-item__thumb" :src="item.result.url" alt="压缩结果预览" />
        <div class="cmp-item__meta">
          <p class="cmp-item__sizes">
            {{ formatBytes(item.file.size) }} → <b>{{ formatBytes(item.result.blob.size) }}</b>
          </p>
          <p class="cmp-item__dims">
            {{ item.image.naturalWidth }}×{{ item.image.naturalHeight }} →
            {{ item.result.width }}×{{ item.result.height }}
          </p>
          <p
            class="cmp-item__delta"
            :class="deltas[index] && deltas[index].grew ? 'is-grew' : 'is-shrank'"
          >
            <template v-if="deltas[index] && deltas[index].grew">
              反而变大 {{ deltas[index].percent.toFixed(1) }}%，建议换格式或收紧宽度上限
            </template>
            <template v-else-if="deltas[index]">
              节省 {{ deltas[index].percent.toFixed(1) }}%
            </template>
          </p>
          <UiButton variant="secondary" size="sm" @click="downloadItem(item)">
            <UiIcon name="download" :size="14" />
            下载
          </UiButton>
        </div>
      </div>

      <p v-else class="cmp-item__pending">压缩中…</p>
    </UiCard>
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
