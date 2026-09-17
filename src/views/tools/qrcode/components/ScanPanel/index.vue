<script setup>
// 二维码识别：图片解码 + 摄像头实时扫码，结果统一分类展示（URL / WiFi / 文本）
// 解码走 jsQR 纯本地计算；结果分类走 common/utils/qr-text.js
import { computed, onUnmounted, ref } from 'vue'
import { classifyQrText } from '@/common/utils/qr-text'
import { copyText } from '@/common/utils/copy'
import { formatBytes } from '@/common/utils/format'
import { useToast } from '@/common/utils/toast'
import { decodeQrImage } from './scripts/decode-qr'
import { createCameraScanner } from './scripts/camera-qr'

const TABS = [
  { label: '图片识别', value: 'image' },
  { label: '摄像头扫码', value: 'camera' },
]

const toast = useToast()

const mode = ref('image')
const file = ref(null)
const previewUrl = ref('')
const decoding = ref(false)
const result = ref(null) // { text, version?, width?, height? }
const failed = ref(false)
const error = ref('')

// 摄像头
const videoRef = ref(null)
const cameraCanvasRef = ref(null)
const cameraActive = ref(false)
let scanner = null

const classified = computed(() => classifyQrText(result.value?.text ?? ''))

function applyText(text) {
  result.value = { text }
  failed.value = false
  error.value = ''
}

async function onFiles(files) {
  const image = files.find((f) => f.type.startsWith('image/'))
  if (!image) {
    toast.error('请选择图片文件')
    return
  }
  file.value = image
  failed.value = false
  error.value = ''
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(image)
  decoding.value = true
  decodeQrImage(image)
    .then((decoded) => {
      result.value = decoded
      failed.value = !decoded
    })
    .catch(() => {
      result.value = null
      failed.value = true
      error.value = '图片读取失败，请重试'
    })
    .finally(() => {
      decoding.value = false
    })
}

function onClear() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  file.value = null
  previewUrl.value = ''
  result.value = null
  failed.value = false
  error.value = ''
}

async function onStartCamera() {
  if (cameraActive.value) return
  try {
    scanner = createCameraScanner(videoRef.value, cameraCanvasRef.value)
    await scanner.start((text) => {
      cameraActive.value = false
      applyText(text)
    })
    cameraActive.value = true
    result.value = null
    failed.value = false
    error.value = ''
  } catch (err) {
    error.value = err.message
  }
}

function onStopCamera() {
  scanner?.stop()
  cameraActive.value = false
}

function onModeChange() {
  if (mode.value !== 'camera') onStopCamera()
}

onUnmounted(() => scanner?.stop())
</script>

<template>
  <UiCard>
    <UiSection title="输入方式">
      <UiTabs v-model="mode" :tabs="TABS" @update:model-value="onModeChange" />

      <div v-if="mode === 'image'" class="qrscan__image-mode">
        <UiDropzone
          accept="image/*"
          title="点击选择图片，或拖拽到此处"
          hint="支持截图、照片等含二维码的图片，JPG / PNG / WebP 均可"
          @files="onFiles"
        />

        <div v-if="file" class="qrscan__file">
          <img v-if="previewUrl" class="qrscan__thumb" :src="previewUrl" alt="图片预览" />
          <div class="qrscan__meta">
            <p class="qrscan__name">{{ file.name }}</p>
            <p class="qrscan__size">{{ formatBytes(file.size) }}</p>
          </div>
          <div class="qrscan__actions">
            <UiButton variant="ghost" size="sm" @click="onClear">
              <UiIcon name="close" :size="14" />
              移除
            </UiButton>
          </div>
        </div>
        <p v-if="decoding" class="qrscan__status">正在解码…</p>
      </div>

      <div v-else class="qrscan__camera">
        <div v-show="cameraActive" class="qrscan__viewport">
          <video ref="videoRef" class="qrscan__video" playsinline muted />
          <canvas ref="cameraCanvasRef" hidden />
        </div>
        <div class="qrscan__row">
          <UiButton v-if="!cameraActive" size="sm" @click="onStartCamera">
            <UiIcon name="eye" :size="14" />
            启动摄像头
          </UiButton>
          <UiButton v-else variant="danger" size="sm" @click="onStopCamera">
            <UiIcon name="close" :size="14" />
            停止
          </UiButton>
          <p class="qrscan__hint">对准二维码即自动识别并停止；需要 HTTPS 或 localhost 环境</p>
        </div>
      </div>

      <p v-if="error" class="qrscan__error">{{ error }}</p>
    </UiSection>
  </UiCard>

  <UiCard v-if="!decoding && (result || failed)">
    <UiSection title="识别结果">
      <template v-if="result && !failed">
        <dl class="qrscan__list">
          <div class="qrscan__row">
            <dt class="qrscan__label">类型</dt>
            <dd class="qrscan__value">
              <UiTag :variant="classified.type === 'url' ? 'primary' : 'neutral'">
                {{ { url: '链接', wifi: 'WiFi 分享码', text: '文本' }[classified.type] }}
              </UiTag>
            </dd>
          </div>
          <div v-if="classified.type === 'url'" class="qrscan__row">
            <dt class="qrscan__label">链接</dt>
            <dd class="qrscan__value">
              <a
                class="qrscan__link"
                :href="classified.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ classified.url }}
              </a>
            </dd>
          </div>
          <template v-if="classified.type === 'wifi'">
            <div class="qrscan__row">
              <dt class="qrscan__label">网络名称</dt>
              <dd class="qrscan__value">{{ classified.wifi.ssid ?? '—' }}</dd>
            </div>
            <div class="qrscan__row">
              <dt class="qrscan__label">加密方式</dt>
              <dd class="qrscan__value">{{ classified.wifi.encryption ?? '—' }}</dd>
            </div>
            <div class="qrscan__row">
              <dt class="qrscan__label">密码</dt>
              <dd class="qrscan__value">{{ classified.wifi.password ?? '（无密码）' }}</dd>
            </div>
          </template>
          <div class="qrscan__row">
            <dt class="qrscan__label">原始内容</dt>
            <dd class="qrscan__value qrscan__raw">{{ result.text }}</dd>
          </div>
        </dl>

        <div class="qrscan__tools">
          <UiButton
            variant="ghost"
            size="sm"
            @click="copyText(result.text, { successMsg: '内容已复制' })"
          >
            <UiIcon name="copy" :size="14" />
            复制内容
          </UiButton>
          <p v-if="classified.type === 'url'" class="qrscan__hint">
            链接已可点击，新窗口打开前请自行确认站点可信。
          </p>
        </div>
        <p v-if="result.version != null" class="qrscan__meta-note">
          二维码规格版本 {{ result.version }}（{{ result.width }}×{{ result.height }} 像素采样）
        </p>
      </template>

      <p v-else-if="failed" class="qrscan__empty">
        未识别到二维码——图片太模糊、二维码被截断，或图中本身没有二维码。可尝试更清晰的截图。
      </p>
    </UiSection>
  </UiCard>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
