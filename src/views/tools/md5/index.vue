<script setup>
// MD5 哈希页（文本 / 文件）
import { ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { hashText, hashFile } from '@/common/utils/md5'

const mode = ref('text')

// ---- 文本模式 ----
const textInput = ref('')
const textResult = ref('')

function computeText() {
  textResult.value = hashText(textInput.value)
}

// ---- 文件模式 ----
const fileName = ref('')
const fileResult = ref('')
const computing = ref(false)
const fileError = ref('')

async function onFilePicked(event) {
  const file = event.target.files?.[0]
  if (!file) return
  fileName.value = file.name
  fileResult.value = ''
  fileError.value = ''
  computing.value = true
  try {
    fileResult.value = await hashFile(file)
  } catch (err) {
    fileError.value = '计算失败：' + (err.message || String(err))
  } finally {
    computing.value = false
  }
  event.target.value = ''
}
</script>

<template>
  <ToolShell
    title="MD5 哈希"
    description="计算文本或文件的 MD5 摘要（32 位十六进制），可用于校验文件完整性。"
  >
    <UiTabs
      v-model="mode"
      :tabs="[
        { label: '文本', value: 'text' },
        { label: '文件', value: 'file' },
      ]"
    />

    <UiCard v-if="mode === 'text'">
      <UiSection title="输入文本">
        <UiTextarea v-model="textInput" placeholder="输入要计算 MD5 的文本…" :rows="6" />
        <div class="md5-actions">
          <UiButton @click="computeText">
            <UiIcon name="hash" :size="15" />
            计算 MD5
          </UiButton>
        </div>
      </UiSection>

      <UiSection v-if="textResult" title="MD5 摘要">
        <div class="md5-result">
          <code class="md5-result__code">{{ textResult }}</code>
          <UiButton variant="secondary" size="sm" @click="copyText(textResult)">
            <UiIcon name="copy" :size="14" />
            复制
          </UiButton>
        </div>
      </UiSection>
    </UiCard>

    <UiCard v-if="mode === 'file'">
      <UiSection title="选择文件">
        <input type="file" @change="onFilePicked" />
        <p class="md5-hint">文件在本地读取计算，不会上传到服务器。</p>
      </UiSection>

      <UiSection v-if="fileName || fileResult" title="计算结果">
        <p class="md5-file">{{ fileName }}</p>
        <div v-if="computing" class="md5-loading">
          <span class="md5-spinner" aria-hidden="true" />
          计算中…
        </div>
        <p v-else-if="fileError" class="md5-error">{{ fileError }}</p>
        <div v-else-if="fileResult" class="md5-result">
          <code class="md5-result__code">{{ fileResult }}</code>
          <UiButton variant="secondary" size="sm" @click="copyText(fileResult)">
            <UiIcon name="copy" :size="14" />
            复制
          </UiButton>
        </div>
      </UiSection>
    </UiCard>

    <UiCard class="md5-warn">
      <UiIcon name="alert-triangle" :size="16" />
      <p>
        MD5 已不再安全，仅适用于校验 / 去重等场景；涉及安全或密码存储请使用 SHA-256 等更安全的算法。
      </p>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
