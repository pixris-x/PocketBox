<script setup>
// 单张图片转换预览项（页面私有组件）
// item 由父级持有（含转换结果与状态），本组件仅渲染控制与结果
import { computed } from 'vue'
import { FORMATS } from '../../scripts/converter'
import { formatBytes } from '@/common/utils/format'
import { downloadBlob } from '@/common/utils/download'

const props = defineProps({
  item: { type: Object, required: true },
  index: { type: Number, default: 0 },
})

const emit = defineEmits(['remove', 'convert'])

const formatOptions = FORMATS.map((f) => ({ label: f.label.toUpperCase(), value: f.value }))
const isLossy = computed(() => FORMATS.find((f) => f.value === props.item.format)?.lossy ?? false)

function onDownload() {
  if (!props.item.blob) return
  const ext = props.item.format
  const base = props.item.file.name.replace(/\.[^.]+$/, '')
  downloadBlob(props.item.blob, `${base}.${ext}`)
}
</script>

<template>
  <div class="preview-item">
    <div class="preview-item__main">
      <div class="preview-item__preview">
        <img :src="item.previewUrl" :alt="item.file.name" />
      </div>

      <div class="preview-item__info">
        <p class="preview-item__name" :title="item.file.name">{{ item.file.name }}</p>
        <p class="preview-item__meta">
          {{ item.originalWidth }}×{{ item.originalHeight }} · 原始 {{ formatBytes(item.file.size) }}
        </p>

        <div class="preview-item__controls">
          <div class="preview-item__row">
            <span class="preview-item__label">目标格式</span>
            <UiSelect v-model="item.format" :options="formatOptions" />
          </div>

          <div v-if="isLossy" class="preview-item__row">
            <span class="preview-item__label">质量</span>
            <UiSlider v-model="item.quality" :min="0.1" :max="1" :step="0.01" show-value />
          </div>

          <div class="preview-item__row">
            <span class="preview-item__label">缩放</span>
            <UiSlider v-model="item.scale" :min="10" :max="100" :step="1" show-value />
          </div>

          <div v-if="item.format === 'jpeg'" class="preview-item__row">
            <span class="preview-item__label">透明背景</span>
            <div class="preview-item__switch">
              <UiSwitch v-model="item.fillBg" />
              <span class="preview-item__switch-text">填充白色</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="preview-item__result">
      <div v-if="item.converting" class="preview-item__loading">
        <span class="preview-item__spinner" aria-hidden="true" />
        转换中…
      </div>
      <div v-else-if="item.error" class="preview-item__error">{{ item.error }}</div>
      <template v-else-if="item.converted && item.url">
        <div class="preview-item__thumb">
          <img :src="item.url" alt="转换结果预览" />
        </div>
        <div class="preview-item__result-meta">
          <span>转换后 {{ formatBytes(item.size) }}</span>
          <UiTag :variant="item.size < item.file.size ? 'success' : 'warning'">
            {{ ((item.size / item.file.size) * 100).toFixed(0) }}%
          </UiTag>
        </div>
        <div class="preview-item__actions">
          <UiButton variant="ghost" size="sm" @click="emit('convert')">
            <UiIcon name="refresh" :size="14" />
            重新转换
          </UiButton>
          <UiButton variant="secondary" size="sm" :disabled="!item.url" @click="onDownload">
            <UiIcon name="download" :size="14" />
            下载
          </UiButton>
        </div>
      </template>
      <template v-else>
        <span class="preview-item__idle">尚未转换</span>
        <div class="preview-item__actions">
          <UiButton variant="primary" size="sm" @click="emit('convert')">
            <UiIcon name="refresh" :size="14" />
            转换
          </UiButton>
        </div>
      </template>
    </div>

    <button type="button" class="preview-item__remove" aria-label="移除" @click="emit('remove', index)">
      <UiIcon name="close" :size="14" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
