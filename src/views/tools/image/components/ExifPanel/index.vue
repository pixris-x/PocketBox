<script setup>
// EXIF 查看器：读取照片元数据（设备/拍摄参数/位置），并可一键清除后导出
// 解析走 common/utils/exif.js 纯函数；清除 = canvas 重绘，只保留像素，全程本地
import { computed, ref } from 'vue'
import { parseExif } from '@/common/utils/exif'
import { copyText } from '@/common/utils/copy'
import { formatBytes } from '@/common/utils/format'
import { downloadBlob } from '@/common/utils/download'
import { useToast } from '@/common/utils/toast'
import Dropzone from './components/Dropzone/index.vue'
import {
  cleanImageFile,
  describeOrientation,
  formatCoordinate,
  formatShutter,
  readArrayBuffer,
} from './scripts/exif-file'

const toast = useToast()

const file = ref(null)
const previewUrl = ref('')
const result = ref(null)
const error = ref('')
const cleaning = ref(false)

function onFile(selected) {
  if (!selected) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
    toast.error('仅支持 JPG / PNG / WebP 图片')
    return
  }
  file.value = selected
  error.value = ''
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(selected)
  readArrayBuffer(selected)
    .then((buffer) => {
      result.value = parseExif(buffer)
    })
    .catch(() => {
      result.value = null
      error.value = '文件读取失败，请重试'
    })
}

function onClear() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  file.value = null
  previewUrl.value = ''
  result.value = null
  error.value = ''
}

const infoRows = computed(() => {
  const r = result.value
  if (!r?.found) return []
  const device = [r.make, r.model].filter(Boolean).join(' ')
  const pixels =
    typeof r.pixelWidth === 'number' && typeof r.pixelHeight === 'number'
      ? `${r.pixelWidth} × ${r.pixelHeight}`
      : null
  const rows = [
    { label: '设备', value: device },
    { label: '软件', value: r.software },
    { label: '拍摄时间', value: r.dateTimeOriginal || r.dateTime },
    { label: '方向', value: describeOrientation(r.orientation) },
    { label: '曝光时间', value: formatShutter(r.exposureTime) },
    {
      label: '光圈',
      value: typeof r.fNumber === 'number' ? `f/${Number(r.fNumber.toFixed(1))}` : null,
    },
    { label: '感光度', value: typeof r.iso === 'number' ? `ISO ${r.iso}` : null },
    {
      label: '焦距',
      value: typeof r.focalLength === 'number' ? `${Number(r.focalLength.toFixed(1))} mm` : null,
    },
    { label: '分辨率', value: pixels },
    { label: '作者', value: r.artist },
    { label: '版权', value: r.copyright },
  ]
  return rows.filter((row) => row.value)
})

const coordinate = computed(() => {
  const gps = result.value?.gps
  return gps ? formatCoordinate(gps.latitude, gps.longitude) : null
})

async function onClean() {
  if (!file.value || cleaning.value) return
  cleaning.value = true
  try {
    const { blob, filename } = await cleanImageFile(file.value)
    downloadBlob(blob, filename)
    toast.success('已导出无元数据副本')
  } catch {
    toast.error('清除失败，请重试')
  } finally {
    cleaning.value = false
  }
}
</script>

<template>
  <UiCard>
    <UiSection title="选择照片">
      <Dropzone @file="onFile" />

      <div v-if="file" class="exif__file">
        <img v-if="previewUrl" class="exif__thumb" :src="previewUrl" alt="照片预览" />
        <div class="exif__file-meta">
          <p class="exif__file-name">{{ file.name }}</p>
          <p class="exif__file-size">{{ formatBytes(file.size) }}</p>
        </div>
        <div class="exif__file-actions">
          <UiButton variant="ghost" size="sm" @click="onClear">
            <UiIcon name="close" :size="14" />
            移除
          </UiButton>
          <UiButton size="sm" :loading="cleaning" @click="onClean">
            <UiIcon name="download" :size="14" />
            清除元数据并导出
          </UiButton>
        </div>
      </div>
      <p v-if="error" class="exif__error">{{ error }}</p>
    </UiSection>
  </UiCard>

  <UiCard v-if="file">
    <UiSection title="元数据">
      <template v-if="result?.found">
        <div class="exif__privacy">
          <UiTag v-if="result.hasGps" variant="danger">
            <UiIcon name="alert-triangle" :size="12" />
            包含位置信息
          </UiTag>
          <UiTag v-else variant="success">未发现 GPS 位置信息</UiTag>
        </div>

        <dl v-if="infoRows.length" class="exif__list">
          <div v-for="row in infoRows" :key="row.label" class="exif__row">
            <dt class="exif__label">{{ row.label }}</dt>
            <dd class="exif__value">{{ row.value }}</dd>
          </div>
        </dl>
        <p v-else class="exif__empty">有 EXIF 结构，但没有可展示的常用字段。</p>

        <div v-if="result.hasGps" class="exif__gps">
          <span class="exif__label">GPS 坐标</span>
          <code class="exif__value">{{ coordinate }}</code>
          <UiButton
            variant="ghost"
            size="sm"
            @click="copyText(coordinate, { successMsg: '坐标已复制' })"
          >
            <UiIcon name="copy" :size="14" />
            复制
          </UiButton>
          <span v-if="result.gps.altitude != null" class="exif__altitude">
            海拔 {{ Number(result.gps.altitude.toFixed(1)) }} m
          </span>
        </div>
      </template>

      <p v-else-if="result" class="exif__empty">
        未检测到 EXIF 信息——图片可能已被处理过（截图 / 社交平台压缩图 / PNG
        绘图），或本身不含元数据。
      </p>
    </UiSection>
  </UiCard>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
