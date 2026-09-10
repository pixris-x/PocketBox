<script setup>
// JSON 格式化 / 压缩 / 校验页
import { ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { useToast } from '@/common/utils/toast'
import { formatJson, minifyJson, parseJson } from '@/common/utils/json'

const { success } = useToast()
const input = ref('')
const output = ref('')
const error = ref('')
const indent = ref(2)
const sortKeys = ref(false)

const indentOptions = [
  { label: '2 空格', value: 2 },
  { label: '4 空格', value: 4 },
  { label: 'Tab', value: 'tab' },
]

function doFormat() {
  error.value = ''
  try {
    output.value = formatJson(input.value, {
      indent: indent.value === 'tab' ? '\t' : Number(indent.value),
      sortKeys: sortKeys.value,
    })
  } catch (err) {
    output.value = ''
    error.value = err.message
  }
}

function doMinify() {
  error.value = ''
  try {
    output.value = minifyJson(input.value)
  } catch (err) {
    output.value = ''
    error.value = err.message
  }
}

function doValidate() {
  error.value = ''
  try {
    parseJson(input.value)
    output.value = ''
    success('JSON 格式有效 ✓')
  } catch (err) {
    output.value = ''
    error.value = err.message
  }
}
</script>

<template>
  <ToolShell title="JSON 格式化" description="格式化、压缩与校验 JSON 数据，支持按字母排序键。">
    <UiCard>
      <UiSection title="输入 JSON">
        <UiTextarea
          v-model="input"
          :rows="10"
          mono
          placeholder='粘贴 JSON 数据，例如：{"name":"test","list":[1,2,3]}'
        />
      </UiSection>

      <div class="json-toolbar">
        <div class="json-toolbar__left">
          <UiButton @click="doFormat">
            <UiIcon name="braces" :size="15" />
            格式化
          </UiButton>
          <UiButton variant="secondary" @click="doMinify">
            <UiIcon name="code" :size="15" />
            压缩
          </UiButton>
          <UiButton variant="ghost" @click="doValidate">
            <UiIcon name="check" :size="15" />
            校验
          </UiButton>
        </div>
        <div class="json-toolbar__right">
          <UiSelect v-model="indent" :options="indentOptions" />
          <div class="json-toolbar__sort">
            <UiSwitch v-model="sortKeys" />
            <span>排序键</span>
          </div>
        </div>
      </div>

      <p v-if="error" class="json-error">{{ error }}</p>

      <UiSection v-if="output" title="输出">
        <UiTextarea :model-value="output" :rows="10" mono />
        <div class="json-actions">
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
