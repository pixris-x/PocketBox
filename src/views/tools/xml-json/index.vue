<script setup>
// XML ↔ JSON 互转：自写精简解析器（属性 @键 / 文本 #text / 重复元素数组），纯本地
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { jsonToXml, xmlToJson } from '@/common/utils/xml-json'
import { copyText } from '@/common/utils/copy'

const TABS = [
  { label: 'XML → JSON', value: 'xml2json' },
  { label: 'JSON → XML', value: 'json2xml' },
]

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<user id="1">
  <name>张三</name>
  <tags>
    <tag>dev</tag>
    <tag>tools</tag>
  </tags>
</user>`

const SAMPLE_JSON = { user: { '@id': '1', name: '张三', tags: { tag: ['dev', 'tools'] } } }

const direction = ref('xml2json')
const input = ref(SAMPLE_XML)

const output = ref('')
const error = ref('')

function convert() {
  error.value = ''
  output.value = ''
  if (!input.value.trim()) {
    error.value = '输入为空'
    return
  }
  if (direction.value === 'xml2json') {
    const result = xmlToJson(input.value)
    if (!result.ok) {
      error.value = result.error
      return
    }
    output.value = JSON.stringify(result.data, null, 2)
  } else {
    try {
      const data = JSON.parse(input.value)
      output.value = jsonToXml(data, { rootName: 'root' })
    } catch (err) {
      error.value = `JSON 解析失败：${err.message}`
    }
  }
}

function onSample() {
  direction.value = direction.value === 'xml2json' ? 'xml2json' : 'json2xml'
  input.value = direction.value === 'xml2json' ? SAMPLE_XML : JSON.stringify(SAMPLE_JSON, null, 2)
  convert()
}

const pageTitle = computed(() => (direction.value === 'xml2json' ? 'XML 内容' : 'JSON 内容'))
</script>

<template>
  <ToolShell
    title="XML ↔ JSON 互转"
    description="两种结构互转：属性转 @键，文本内容无子元素时直接作为值，重复元素转数组。本地解析，零依赖。"
  >
    <UiCard>
      <UiSection title="转换方向">
        <UiTabs v-model="direction" :tabs="TABS" />
      </UiSection>

      <UiSection :title="pageTitle">
        <UiTextarea
          v-model="input"
          :rows="10"
          mono
          :placeholder="direction === 'xml2json' ? '粘贴 XML…' : '粘贴 JSON…'"
        />
        <div class="xmljson__row">
          <UiButton variant="ghost" size="sm" @click="onSample">
            <UiIcon name="sparkles" :size="14" />
            填入示例
          </UiButton>
          <UiButton size="sm" :disabled="!input" @click="convert">
            <UiIcon name="refresh" :size="14" />
            转换
          </UiButton>
        </div>
      </UiSection>
    </UiCard>

    <UiCard v-if="output || error">
      <UiSection :title="error ? '转换失败' : '转换结果'">
        <p v-if="error" class="xmljson__error">{{ error }}</p>
        <template v-else>
          <pre class="xmljson__output">{{ output }}</pre>
          <div class="xmljson__row">
            <UiButton
              size="sm"
              class="xmljson__copy"
              @click="copyText(output, { successMsg: '转换结果已复制' })"
            >
              <UiIcon name="copy" :size="14" />
              复制结果
            </UiButton>
          </div>
        </template>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
