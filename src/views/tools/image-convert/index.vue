<script setup>
// 图片格式转换页
// 流程：先上传预览 → 选择格式/质量/缩放 → 手动点击"转换"才会真正转换
import { reactive, ref, watch } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { downloadBlob } from '@/common/utils/download'
import Dropzone from './components/Dropzone/index.vue'
import PreviewItem from './components/PreviewItem/index.vue'
import { loadImage, drawToCanvas, canvasToBlob, mimeFor, formatFromFilename } from './scripts/converter'

const items = ref([])

function addFiles(files) {
  files.forEach((file) => {
    const item = reactive({
      file,
      previewUrl: '',
      originalWidth: 0,
      originalHeight: 0,
      format: formatFromFilename(file.name),
      quality: 0.92,
      scale: 100,
      fillBg: true,
      // 结果
      url: '',
      blob: null,
      size: 0,
      converted: false,
      converting: false,
      error: '',
      image: null,
      objectUrl: '',
    })
    items.value.push(item)
    prepareItem(item)
  })
}

/** 仅加载并预览原图，不做任何转换 */
async function prepareItem(item) {
  try {
    const { img, url } = await loadImage(item.file)
    item.image = img
    item.objectUrl = url
    item.previewUrl = url
    item.originalWidth = img.naturalWidth
    item.originalHeight = img.naturalHeight
  } catch (err) {
    item.error = err.message
  }
}

/** 按当前设置转换单张图片 */
async function convertItem(item) {
  if (!item.image) return
  item.converting = true
  try {
    const canvas = drawToCanvas(item.image, {
      scale: item.scale,
      bgColor: item.format === 'jpeg' && item.fillBg ? '#ffffff' : '',
    })
    const blob = await canvasToBlob(canvas, mimeFor(item.format), item.quality)
    if (item.url) URL.revokeObjectURL(item.url)
    item.url = URL.createObjectURL(blob)
    item.blob = blob
    item.size = blob.size
    item.converted = true
    item.error = ''
  } catch (err) {
    item.error = err.message
  } finally {
    item.converting = false
  }
}

/** 批量转换所有已加载图片 */
function convertAll() {
  items.value.forEach((item) => {
    if (item.image && !item.converting) convertItem(item)
  })
}

/** 设置变更时清除旧结果，提示需重新转换（不自动转换） */
watch(
  () => items.value.map((item) => `${item.format}|${item.quality}|${item.scale}|${item.fillBg}`),
  (now, prev) => {
    items.value.forEach((item, i) => {
      if (prev && prev[i] !== now[i]) invalidateResult(item)
    })
  }
)

function invalidateResult(item) {
  if (!item.image || !item.converted) return
  item.converted = false
  if (item.url) URL.revokeObjectURL(item.url)
  item.url = ''
  item.blob = null
  item.size = 0
}

function removeItem(index) {
  const [item] = items.value.splice(index, 1)
  if (item.objectUrl) URL.revokeObjectURL(item.objectUrl)
  if (item.url) URL.revokeObjectURL(item.url)
}

function downloadAll() {
  items.value
    .filter((item) => item.converted && item.blob && !item.error)
    .forEach((item) => {
      const ext = item.format
      const base = item.file.name.replace(/\.[^.]+$/, '')
      downloadBlob(item.blob, `${base}.${ext}`)
    })
}
</script>

<template>
  <ToolShell
    title="图片格式转换"
    description="PNG / JPEG / WebP 互相转换，支持质量与缩放调节。先上传预览，选好格式与参数后点击转换。全部在本地浏览器完成，图片不会上传。"
  >
    <Dropzone @files="addFiles" />

    <div v-if="items.length" class="image-tool__bar">
      <span class="image-tool__count">共 {{ items.length }} 张图片</span>
      <div class="image-tool__bar-actions">
        <UiButton variant="secondary" size="sm" @click="convertAll">
          <UiIcon name="refresh" :size="14" />
          全部转换
        </UiButton>
        <UiButton variant="secondary" size="sm" @click="downloadAll">
          <UiIcon name="download" :size="14" />
          全部下载
        </UiButton>
      </div>
    </div>

    <div v-if="items.length" class="image-tool__list">
      <PreviewItem
        v-for="(item, index) in items"
        :key="item.file.name + index"
        :item="item"
        :index="index"
        @remove="removeItem"
        @convert="convertItem(item)"
      />
    </div>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
