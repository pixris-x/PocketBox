<script setup>
// curl → 代码：把 cURL 命令转成 fetch / axios / Python requests，纯本地解析
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { parseCurl, toAxios, toCurl, toFetch, toFetchFormData, toPython } from '@/common/utils/curl'

const TARGETS = [
  { label: 'fetch', value: 'fetch' },
  { label: 'axios', value: 'axios' },
  { label: 'Python', value: 'python' },
  { label: 'curl（规范化）', value: 'curl' },
]

const SAMPLE = `curl -X POST 'https://api.example.com/v1/items' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer token' \\
  -d '{"name":"demo","tags":["a","b"]}'`

const input = ref(SAMPLE)
const target = ref('fetch')

const parsed = computed(() => parseCurl(input.value))

const output = computed(() => {
  if (!parsed.value.ok) return ''
  const request = parsed.value.request
  // 含 -F 表单时，fetch 目标给 FormData 骨架（浏览器里最实用）
  if (request.form.length && target.value === 'fetch') return toFetchFormData(request)
  switch (target.value) {
    case 'axios':
      return toAxios(request)
    case 'python':
      return toPython(request)
    case 'curl':
      return toCurl(request)
    default:
      return toFetch(request)
  }
})

const summary = computed(() => {
  if (!parsed.value.ok) return null
  const request = parsed.value.request
  return {
    method: request.method,
    url: request.url,
    headerCount: request.headers.length,
    hasBody: Boolean(request.body) || request.form.length > 0,
    isForm: request.form.length > 0,
  }
})
</script>

<template>
  <ToolShell
    title="cURL 转代码"
    description="把 cURL 命令转换成 fetch / axios / Python requests 代码：自动识别方法、请求头、请求体与 Basic 认证。纯本地解析，命令内容不上传。"
  >
    <UiCard>
      <UiSection
        title="cURL 命令"
        description="支持行尾 \\ 续行、单双引号、-X / -H / -d / -u / -b / -A / -F 等常用选项"
      >
        <UiTextarea v-model="input" :rows="8" mono placeholder="粘贴一条 curl 命令…" />
        <div class="curlconv__row">
          <UiButton variant="ghost" size="sm" @click="input = SAMPLE">
            <UiIcon name="sparkles" :size="14" />
            填入示例
          </UiButton>
          <UiButton variant="ghost" size="sm" :disabled="!input" @click="input = ''">
            <UiIcon name="close" :size="14" />
            清空
          </UiButton>
        </div>
        <p v-if="!parsed.ok" class="curlconv__error">{{ parsed.error }}</p>
      </UiSection>
    </UiCard>

    <UiCard v-if="parsed.ok">
      <UiSection title="解析摘要">
        <div class="curlconv__tags">
          <UiTag variant="primary">{{ summary.method }}</UiTag>
          <UiTag variant="neutral">{{ summary.headerCount }} 个请求头</UiTag>
          <UiTag v-if="summary.hasBody" variant="neutral">
            {{ summary.isForm ? 'multipart 表单' : '请求体' }}
          </UiTag>
        </div>
        <p class="curlconv__url">{{ summary.url }}</p>
        <p v-if="summary.isForm" class="curlconv__hint">
          含 -F 表单：fetch 输出为 FormData 骨架，文件字段（@路径）需在代码里替换为真实的 File
          对象。
        </p>
      </UiSection>

      <UiSection title="目标语言">
        <UiTabs v-model="target" :tabs="TARGETS" />
        <pre class="curlconv__output">{{ output }}</pre>
        <div class="curlconv__row">
          <UiButton
            size="sm"
            class="curlconv__copy"
            @click="copyText(output, { successMsg: '代码已复制' })"
          >
            <UiIcon name="copy" :size="14" />
            复制代码
          </UiButton>
        </div>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
