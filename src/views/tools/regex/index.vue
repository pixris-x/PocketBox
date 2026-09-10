<script setup>
// 正则表达式测试页
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'

const pattern = ref('(\\w+)@(\\w+)\\.com')
const text = ref(`联系邮箱：
alice@example.com
bob@example.com
无效地址：test@@mail`)

const FLAGS = [
  { key: 'g', label: '全局 g' },
  { key: 'i', label: '忽略大小写 i' },
  { key: 'm', label: '多行 m' },
  { key: 's', label: 'dotAll s' },
  { key: 'u', label: 'Unicode u' },
]

const enabledFlags = ref(['g'])
const replaceValue = ref('')
const showReplace = ref(false)

const flags = computed(() => enabledFlags.value.join(''))

function toggleFlag(key) {
  const list = enabledFlags.value
  const index = list.indexOf(key)
  if (index === -1) list.push(key)
  else list.splice(index, 1)
}

const regex = computed(() => {
  if (!pattern.value) return null
  try {
    return new RegExp(pattern.value, flags.value)
  } catch {
    return undefined // 编译失败
  }
})

const error = computed(() => (regex.value === undefined ? '正则表达式语法有误' : ''))

const matches = computed(() => {
  const compiled = regex.value
  if (!compiled || !text.value) return []
  const source = String(text.value)
  const result = []
  // 零宽匹配的死循环防护：命中位置未前进时手动后移
  let guard = 0
  let match
  const local = new RegExp(
    compiled.source,
    flags.value.includes('g') ? flags.value : `${flags.value}g`
  )

  while ((match = local.exec(source)) !== null && guard < 10000) {
    result.push({
      value: match[0],
      index: match.index,
      groups: match.slice(1),
    })
    if (match[0] === '') local.lastIndex++
    guard++
  }
  return result
})

const replaced = computed(() => {
  const compiled = regex.value
  if (!compiled) return ''
  try {
    return String(text.value).replace(
      new RegExp(compiled.source, flags.value.includes('g') ? flags.value : `${flags.value}g`),
      replaceValue.value
    )
  } catch {
    return ''
  }
})

const PRESETS = [
  { label: '邮箱', value: '[\\w.+-]+@[\\w-]+\\.[\\w.]+' },
  { label: '手机号', value: '1[3-9]\\d{9}' },
  { label: 'URL', value: 'https?://[^\\s]+' },
  {
    label: 'IPv4',
    value: '(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d?\\d)',
  },
  { label: '日期', value: '\\d{4}-\\d{2}-\\d{2}' },
  { label: '数字', value: '-?\\d+(?:\\.\\d+)?' },
]
</script>

<template>
  <ToolShell title="正则测试" description="实时验证正则表达式的匹配结果、捕获分组与替换效果。">
    <UiCard>
      <UiSection title="正则表达式">
        <div class="regex-pattern">
          <span class="regex-pattern__slash">/</span>
          <UiInput v-model="pattern" class="regex-pattern__input" placeholder="输入正则表达式" />
          <span class="regex-pattern__slash">/</span>
          <span class="regex-pattern__flags">{{ flags }}</span>
        </div>
        <UiTag v-if="error" variant="danger">{{ error }}</UiTag>

        <div class="regex-flags">
          <UiCheckbox
            v-for="flag in FLAGS"
            :key="flag.key"
            :model-value="enabledFlags.includes(flag.key)"
            @update:model-value="toggleFlag(flag.key)"
          >
            {{ flag.label }}
          </UiCheckbox>
        </div>

        <div class="regex-presets">
          <button
            v-for="preset in PRESETS"
            :key="preset.label"
            type="button"
            class="regex-preset"
            @click="pattern = preset.value"
          >
            {{ preset.label }}
          </button>
        </div>
      </UiSection>

      <UiSection title="测试文本">
        <UiTextarea v-model="text" :rows="7" mono placeholder="输入待匹配的文本…" />
      </UiSection>

      <UiSection
        title="匹配结果"
        :description="matches.length ? `共 ${matches.length} 处匹配` : '当前没有匹配项'"
      >
        <div v-if="matches.length" class="regex-matches">
          <div v-for="(item, index) in matches" :key="index" class="regex-match">
            <span class="regex-match__index">#{{ index + 1 }} @{{ item.index }}</span>
            <code class="regex-match__value">{{ item.value || '(空匹配)' }}</code>
            <div v-if="item.groups.length" class="regex-match__groups">
              <span v-for="(group, gi) in item.groups" :key="gi" class="regex-group">
                ${{ gi + 1 }}: {{ group === undefined ? '(未参与)' : group }}
              </span>
            </div>
          </div>
        </div>
        <p v-else class="regex-empty">没有匹配到内容。</p>
      </UiSection>

      <UiSection title="替换预览">
        <UiSwitch v-model="showReplace" />
        <span class="regex-replace__toggle">开启替换</span>
        <template v-if="showReplace">
          <UiInput
            v-model="replaceValue"
            class="regex-replace__input"
            placeholder="替换为（支持 $1 引用分组）"
          />
          <div class="regex-replace__output">
            <pre class="regex-replace__text">{{ replaced || '(空)' }}</pre>
            <UiButton variant="secondary" size="sm" @click="copyText(replaced)">
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
