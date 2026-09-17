<script setup>
// YAML ↔ JSON 互转：与 XML↔JSON、CSV↔JSON 凑成数据格式矩阵，纯本地
import { computed, ref } from 'vue'
import { copyText } from '@/common/utils/copy'
import { jsonToYaml, yamlToJson } from '@/common/utils/yaml-json'

const TABS = [
  { label: 'YAML → JSON', value: 'yaml2json' },
  { label: 'JSON → YAML', value: 'json2yaml' },
]

const SAMPLE_YAML = `# 部署配置示例
name: pocketbox
replicas: 2
image:
  repository: pocketbox/web
  tag: "1.4.0"
env:
  - name: NODE_ENV
    value: production
  - name: TZ
    value: Asia/Shanghai`

const SAMPLE_JSON = JSON.stringify(
  { name: 'pocketbox', replicas: 2, image: { repository: 'pocketbox/web', tag: '1.4.0' } },
  null,
  2
)

const direction = ref('yaml2json')
const input = ref(SAMPLE_YAML)

const result = computed(() => {
  if (!input.value.trim()) return { ok: false, error: '输入为空' }
  if (direction.value === 'yaml2json') {
    const converted = yamlToJson(input.value)
    if (!converted.ok) return converted
    return { ok: true, output: JSON.stringify(converted.value, null, 2) }
  }
  const converted = jsonToYaml(input.value)
  if (!converted.ok) return converted
  return { ok: true, output: converted.text }
})

function onSample() {
  input.value = direction.value === 'yaml2json' ? SAMPLE_YAML : SAMPLE_JSON
}
</script>

<template>
  <UiCard>
    <UiSection title="转换方向">
      <UiTabs v-model="direction" :tabs="TABS" />
    </UiSection>

    <UiSection :title="direction === 'yaml2json' ? 'YAML 内容' : 'JSON 内容'">
      <UiTextarea
        v-model="input"
        :rows="12"
        mono
        :placeholder="direction === 'yaml2json' ? '粘贴 YAML…' : '粘贴 JSON…'"
      />
      <div class="yamljson__row">
        <UiButton variant="ghost" size="sm" @click="onSample">
          <UiIcon name="sparkles" :size="14" />
          填入示例
        </UiButton>
        <UiButton variant="ghost" size="sm" :disabled="!input" @click="input = ''">
          <UiIcon name="close" :size="14" />
          清空
        </UiButton>
      </div>
    </UiSection>
  </UiCard>

  <UiCard>
    <UiSection :title="direction === 'yaml2json' ? 'JSON 结果' : 'YAML 结果'">
      <p v-if="!result.ok" class="yamljson__error">{{ result.error }}</p>
      <template v-else>
        <pre class="yamljson__output">{{ result.output }}</pre>
        <div class="yamljson__row">
          <UiButton
            size="sm"
            class="yamljson__copy"
            @click="copyText(result.output, { successMsg: '转换结果已复制' })"
          >
            <UiIcon name="copy" :size="14" />
            复制结果
          </UiButton>
        </div>
      </template>
    </UiSection>
  </UiCard>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
