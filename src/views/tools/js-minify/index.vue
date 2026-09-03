<script setup>
// JavaScript 压缩页（terser Web Worker）
import { onBeforeUnmount, ref, computed } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { downloadText } from '@/common/utils/download'
import { formatBytes, savingPercent } from '@/common/utils/format'
import MinifyWorker from './scripts/minify.worker.js?worker'

const worker = new MinifyWorker()

const fileInput = ref(null)
const code = ref('')
const compress = ref(true)
const mangle = ref(true)

const output = ref('')
const error = ref('')
const processing = ref(false)

const originalSize = computed(() => new Blob([code.value]).size)
const resultSize = computed(() => new Blob([output.value]).size)
const saving = computed(() => savingPercent(originalSize.value, resultSize.value))

function minify() {
  if (!code.value.trim()) {
    error.value = '请输入要压缩的 JavaScript 代码'
    return
  }
  processing.value = true
  error.value = ''
  output.value = ''
  worker.postMessage({ code: code.value, compress: compress.value, mangle: mangle.value })
}

worker.onmessage = (event) => {
  processing.value = false
  const data = event.data
  if (data.ok) {
    output.value = data.code
  } else {
    error.value = data.error || '压缩失败'
  }
}

function onCopy() {
  copyText(output.value)
}

function onDownload() {
  downloadText('minified.js', output.value, 'text/javascript;charset=utf-8')
}

function onLoadFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    code.value = String(reader.result)
  }
  reader.readAsText(file)
  event.target.value = ''
}

onBeforeUnmount(() => worker.terminate())
</script>

<template>
  <ToolShell
    title="JavaScript 压缩"
    description="基于 terser 的 JS 压缩 / 混淆，在 Web Worker 中运行，不阻塞页面。支持压缩与变量名混淆开关。"
  >
    <UiCard>
      <div class="jsmin-options">
        <div class="jsmin-options__item">
          <UiSwitch v-model="compress" />
          <span>压缩（删除空格、注释、优化代码）</span>
        </div>
        <div class="jsmin-options__item">
          <UiSwitch v-model="mangle" />
          <span>混淆（缩短局部变量名）</span>
        </div>
        <div class="jsmin-options__item">
          <input ref="fileInput" type="file" accept=".js,.mjs,.cjs" hidden @change="onLoadFile" />
          <UiButton variant="ghost" size="sm" @click="fileInput.click()">
            <UiIcon name="upload" :size="14" />
            加载 JS 文件
          </UiButton>
        </div>
      </div>

      <UiSection title="源代码">
        <UiTextarea v-model="code" :rows="10" mono placeholder="粘贴需要压缩的 JavaScript 代码…" />
        <div class="jsmin-actions">
          <UiButton :loading="processing" @click="minify">
            <UiIcon name="terminal" :size="15" />
            压缩
          </UiButton>
          <span class="jsmin-size">原始 {{ formatBytes(originalSize) }}</span>
        </div>
      </UiSection>

      <p v-if="error" class="jsmin-error">{{ error }}</p>

      <UiSection v-if="output" title="压缩结果">
        <UiTextarea :model-value="output" :rows="10" mono />
        <div class="jsmin-actions">
          <UiButton variant="secondary" size="sm" @click="onCopy">
            <UiIcon name="copy" :size="14" />
            复制结果
          </UiButton>
          <UiButton variant="ghost" size="sm" @click="onDownload">
            <UiIcon name="download" :size="14" />
            下载 .js
          </UiButton>
          <UiTag :variant="saving > 0 ? 'success' : 'warning'">
            {{ formatBytes(resultSize) }}（节省 {{ saving.toFixed(1) }}%）
          </UiTag>
        </div>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
