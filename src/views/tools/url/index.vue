<script setup>
// URL 编码 / 解码页
import { ref, watch } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { encodeComponent, decodeComponent } from '@/common/utils/url'

const mode = ref('encode')
const input = ref('')
const output = ref('')
const error = ref('')
const encodeAll = ref(false)

// 输入变化时自动转换
watch([mode, input, encodeAll], () => {
  error.value = ''
  if (!input.value) {
    output.value = ''
    return
  }
  if (mode.value === 'encode') {
    output.value = encodeComponent(input.value, { encodeAll: encodeAll.value })
  } else {
    const result = decodeComponent(input.value)
    if (result.ok) {
      output.value = result.value
    } else {
      output.value = ''
      error.value = result.error
    }
  }
})

function swap() {
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
  input.value = output.value
}
</script>

<template>
  <ToolShell
    title="URL 编码 / 解码"
    description="对 URL 组件进行编码或解码，支持查询串中的 + 号。"
  >
    <UiCard>
      <UiTabs v-model="mode" :tabs="[{ label: '编码', value: 'encode' }, { label: '解码', value: 'decode' }]" />

      <div class="url-toolbar">
        <div v-if="mode === 'encode'" class="url-toolbar__option">
          <UiSwitch v-model="encodeAll" />
          <span>全量编码（含 !'()* 字符）</span>
        </div>
        <UiButton variant="ghost" size="sm" @click="swap">
          <UiIcon name="refresh" :size="14" />
          交换输入 / 输出
        </UiButton>
      </div>

      <UiSection :title="mode === 'encode' ? '待编码文本' : '待解码文本'">
        <UiTextarea v-model="input" :rows="6" mono placeholder="输入内容，将实时转换…" />
      </UiSection>

      <p v-if="error" class="url-error">{{ error }}</p>

      <UiSection v-if="output" :title="mode === 'encode' ? '编码结果' : '解码结果'">
        <UiTextarea :model-value="output" :rows="6" mono />
        <div class="url-actions">
          <UiButton variant="secondary" size="sm" @click="copyText(output)">
            <UiIcon name="copy" :size="14" />
            复制结果
          </UiButton>
        </div>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
