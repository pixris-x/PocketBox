<script setup>
// Base64 转换页（文本 / 文件）
import { ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { downloadText, downloadBlob } from '@/common/utils/download'
import {
  textToBase64,
  base64ToText,
  isValidBase64,
  fileToBase64,
  base64ToBlob,
  mimeFromDataUrl,
} from '@/common/utils/base64'

const mode = ref('text')

// ---- 文本模式 ----
const textInput = ref('')
const textOutput = ref('')
const textError = ref('')

function encodeText() {
  textError.value = ''
  textOutput.value = textToBase64(textInput.value)
}

function decodeText() {
  textError.value = ''
  try {
    textOutput.value = base64ToText(textInput.value)
  } catch {
    textError.value = '解码失败：输入不是合法的 Base64 字符串'
  }
}

// ---- 文件模式 ----
const fileToB64 = ref('')
const fileName = ref('')
const fileDataUrl = ref('')
const b64Input = ref('')
const outputName = ref('decoded.bin')
const fileError = ref('')

async function onFilePicked(event) {
  const file = event.target.files?.[0]
  if (!file) return
  fileName.value = file.name
  try {
    fileDataUrl.value = await fileToBase64(file)
    fileToB64.value = fileDataUrl.value
    outputName.value = 'decoded_' + file.name
  } catch (err) {
    fileError.value = err.message
  }
  event.target.value = ''
}

function copyFileBase64() {
  copyText(fileToB64.value)
}

function downloadB64File() {
  fileError.value = ''
  try {
    const b64 = b64Input.value.trim()
    if (!isValidBase64(b64)) {
      fileError.value = 'Base64 无效或包含 data URL 前缀无法识别'
      return
    }
    // 尝试从 data URL 前缀识别 MIME
    const mime = mimeFromDataUrl(b64Input.value.trim()) || 'application/octet-stream'
    downloadBlob(base64ToBlob(b64, mime), outputName.value)
  } catch {
    fileError.value = '解码失败：Base64 内容无效'
  }
}
</script>

<template>
  <ToolShell
    title="Base64 转换"
    description="文本与文件的 Base64 编码 / 解码。Unicode 安全（UTF-8），支持中文等字符。"
  >
    <UiTabs
      v-model="mode"
      :tabs="[
        { label: '文本转换', value: 'text' },
        { label: '文件转换', value: 'file' },
      ]"
    />

    <!-- 文本模式 -->
    <UiCard v-if="mode === 'text'">
      <UiSection title="输入">
        <UiTextarea v-model="textInput" placeholder="输入要编码或解码的文本…" :rows="6" />
      </UiSection>

      <div class="b64-actions">
        <UiButton @click="encodeText">
          <UiIcon name="code" :size="15" />
          编码为 Base64
        </UiButton>
        <UiButton variant="secondary" @click="decodeText">
          <UiIcon name="code" :size="15" />
          解码为文本
        </UiButton>
      </div>

      <p v-if="textError" class="b64-error">{{ textError }}</p>

      <UiSection v-if="textOutput" title="结果">
        <UiTextarea :model-value="textOutput" :rows="6" mono />
        <div class="b64-actions">
          <UiButton variant="secondary" size="sm" @click="copyText(textOutput)">
            <UiIcon name="copy" :size="14" />
            复制结果
          </UiButton>
        </div>
      </UiSection>
    </UiCard>

    <!-- 文件模式 -->
    <UiCard v-if="mode === 'file'">
      <UiSection title="文件 → Base64">
        <input type="file" accept="*/*" @change="onFilePicked" />
        <p class="b64-hint">
          {{
            fileName
              ? `已选择：${fileName}`
              : '选择一个文件，读取为 Base64 字符串（本地读取，不会上传）'
          }}
        </p>
        <UiTextarea v-if="fileToB64" :model-value="fileToB64" :rows="6" mono />
        <div v-if="fileToB64" class="b64-actions">
          <UiButton variant="secondary" size="sm" @click="copyFileBase64">
            <UiIcon name="copy" :size="14" />
            复制 Base64
          </UiButton>
          <UiButton
            variant="ghost"
            size="sm"
            @click="downloadText('base64.txt', fileToB64, 'text/plain;charset=utf-8')"
          >
            <UiIcon name="download" :size="14" />
            下载为 .txt
          </UiButton>
        </div>
      </UiSection>

      <UiDivider />

      <UiSection title="Base64 → 文件">
        <UiTextarea
          v-model="b64Input"
          placeholder="粘贴 Base64 字符串（支持带 data URL 前缀），然后下载解码后的文件…"
          :rows="4"
          mono
        />
        <div class="b64-row">
          <UiInput v-model="outputName" placeholder="输出文件名" class="b64-row__name" />
          <UiButton @click="downloadB64File">
            <UiIcon name="download" :size="15" />
            解码并下载
          </UiButton>
        </div>
        <p v-if="fileError" class="b64-error">{{ fileError }}</p>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
