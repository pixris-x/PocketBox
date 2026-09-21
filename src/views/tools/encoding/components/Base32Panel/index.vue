<script setup>
// Base32 编解码页（RFC 4648）
// 与 TOTP 密钥同字母表：身份验证器里看到的 secret 可直接粘进来解
import { computed, ref } from 'vue'
import { copyText } from '@/common/utils/copy'
import { downloadText } from '@/common/utils/download'
import { base32ToText, cleanBase32, isValidBase32, textToBase32 } from '@/common/utils/base32'

const input = ref('')
const output = ref('')
const padding = ref(true)
const error = ref('')
const action = ref('')

const looksValid = computed(() => input.value.trim() !== '' && isValidBase32(input.value))
const cleanLength = computed(() => cleanBase32(input.value).length)

function encode() {
  error.value = ''
  action.value = 'encode'
  output.value = textToBase32(input.value, { padding: padding.value })
}

function decode() {
  error.value = ''
  action.value = 'decode'
  try {
    output.value = base32ToText(input.value)
  } catch (err) {
    output.value = ''
    error.value = err.message
  }
}

function swap() {
  if (!output.value) return
  input.value = output.value
  output.value = ''
  error.value = ''
}

function clearAll() {
  input.value = ''
  output.value = ''
  error.value = ''
  action.value = ''
}
</script>

<template>
  <UiCard>
    <UiSection title="输入">
      <UiTextarea
        v-model="input"
        placeholder="输入要编码的文本，或粘贴 Base32 串（A-Z 与 2-7）…"
        :rows="6"
        mono
      />
      <div class="ent-meta">
        <div class="ent-check">
          <UiCheckbox v-model="padding" />
          <span class="ent-check__text">输出补 <code>=</code> 填充到 8 的倍数</span>
        </div>
        <span v-if="looksValid" class="ent-hint">结构合法，共 {{ cleanLength }} 个字符</span>
      </div>
    </UiSection>

    <div class="ent-actions">
      <UiButton @click="encode">
        <UiIcon name="code" :size="15" />
        编码为 Base32
      </UiButton>
      <UiButton variant="secondary" @click="decode">
        <UiIcon name="code" :size="15" />
        解码为文本
      </UiButton>
      <UiButton variant="ghost" @click="clearAll">
        <UiIcon name="close" :size="15" />
        清空
      </UiButton>
    </div>

    <p v-if="error" class="ent-error">{{ error }}</p>

    <UiSection v-if="output" :title="action === 'encode' ? 'Base32 结果' : '解码结果'">
      <UiTextarea :model-value="output" :rows="6" mono />
      <div class="ent-actions">
        <UiButton variant="secondary" size="sm" @click="copyText(output)">
          <UiIcon name="copy" :size="14" />
          复制结果
        </UiButton>
        <UiButton variant="secondary" size="sm" @click="swap">
          <UiIcon name="refresh" :size="14" />
          结果移到输入
        </UiButton>
        <UiButton
          variant="ghost"
          size="sm"
          @click="downloadText('base32.txt', output, 'text/plain;charset=utf-8')"
        >
          <UiIcon name="download" :size="14" />
          下载为 .txt
        </UiButton>
      </div>
    </UiSection>
  </UiCard>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
