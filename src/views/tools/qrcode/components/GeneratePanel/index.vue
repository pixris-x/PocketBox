<script setup>
// 二维码生成页
import { computed, onMounted, ref, watch } from 'vue'
import { downloadDataUrl } from '@/common/utils/download'
import { buildMatrix } from './scripts/qrcode'

const text = ref('https://example.com')
const level = ref('M')
const size = ref(256)
const canvasRef = ref(null)

const LEVELS = [
  { label: 'L · 7%', value: 'L' },
  { label: 'M · 15%', value: 'M' },
  { label: 'Q · 25%', value: 'Q' },
  { label: 'H · 30%', value: 'H' },
]

const matrix = computed(() => buildMatrix(text.value, level.value))
const isOverflow = computed(() => matrix.value === undefined)
const isEmpty = computed(() => matrix.value === null)

const QUIET_ZONE = 4 // 标准要求的静默区（模块数）

function draw() {
  const canvas = canvasRef.value
  const model = matrix.value
  if (!canvas || !model) return

  const total = model.count + QUIET_ZONE * 2
  const scale = Math.max(1, Math.floor(size.value / total))
  const canvasSize = total * scale
  canvas.width = canvasSize
  canvas.height = canvasSize

  const ctx = canvas.getContext('2d')
  // 二维码需在白底黑模块下才保证识别率，属功能性颜色，不走主题 token
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvasSize, canvasSize)
  ctx.fillStyle = '#000000'
  for (let row = 0; row < model.count; row++) {
    for (let col = 0; col < model.count; col++) {
      if (!model.isDark(row, col)) continue
      ctx.fillRect((col + QUIET_ZONE) * scale, (row + QUIET_ZONE) * scale, scale, scale)
    }
  }
}

function onDownload() {
  if (!canvasRef.value) return
  downloadDataUrl(canvasRef.value.toDataURL('image/png'), 'qrcode.png')
}

onMounted(draw)
watch([text, level, size], draw)
</script>

<template>
  <UiCard>
    <UiSection title="生成结果">
      <div class="qrcode-preview">
        <canvas v-show="!isOverflow && !isEmpty" ref="canvasRef" class="qrcode-canvas" />
        <p v-if="isEmpty" class="qrcode-placeholder">输入内容后生成二维码</p>
        <UiTag v-else-if="isOverflow" variant="danger">
          内容过长，当前纠错级别下无法生成，请缩短内容或降低纠错级别
        </UiTag>
      </div>
      <div v-if="!isOverflow && !isEmpty" class="qrcode-meta">
        <UiTag variant="neutral">{{ matrix.count }} × {{ matrix.count }} 模块</UiTag>
        <UiTag variant="neutral">纠错级别 {{ level }}</UiTag>
      </div>
      <div class="qrcode-actions">
        <UiButton size="sm" :disabled="isOverflow || isEmpty" @click="onDownload">
          <UiIcon name="download" :size="14" />
          下载 PNG
        </UiButton>
      </div>
    </UiSection>

    <UiSection title="活动内容">
      <UiTextarea v-model="text" :rows="4" placeholder="输入文本、链接或任意内容…" />
    </UiSection>

    <UiSection title="生成选项" description="纠错级别越高，容错能力越强，但容量越小">
      <div class="qrcode-row">
        <span class="qrcode-row__label">纠错级别</span>
        <UiSelect v-model="level" :options="LEVELS" class="qrcode-row__control" />
      </div>
      <div class="qrcode-row">
        <span class="qrcode-row__label">导出尺寸</span>
        <UiSlider
          v-model="size"
          :min="128"
          :max="512"
          :step="32"
          show-value
          class="qrcode-row__control"
        />
      </div>
    </UiSection>
  </UiCard>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
