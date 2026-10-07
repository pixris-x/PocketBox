<script setup>
// JSON 转类型定义页：把 JSON 推断成 TypeScript / Go / Python / Java 的类型定义
// 推断与渲染算法在 common/utils/json-types.js，纯本地计算
import { computed, ref, watch } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import {
  JSON_TYPE_DEFAULT_NAMING,
  JSON_TYPE_INDENTS,
  JSON_TYPE_LANGUAGES,
  JSON_TYPE_NAMINGS,
  jsonToType,
  summarizeTypeStats,
} from '@/common/utils/json-types'

const SAMPLE = JSON.stringify(
  {
    id: 1024,
    name: 'pocketBox',
    score: 9.5,
    enabled: true,
    tags: ['json', 'type'],
    homepage: null,
    author: { nickname: 'pixris', age: 30 },
    repository: { url: 'https://github.com/pixris-x/pocketBox', stars: 0 },
    maintainers: [
      { name: 'pixris', role: 'owner' },
      { name: 'someone', role: 'member', email: null },
    ],
  },
  null,
  2
)

const input = ref('')
const lang = ref('typescript')
const naming = ref('keep')
const indent = ref(2)
const typeName = ref('Root')
const error = ref('')

const hasInput = computed(() => input.value.trim().length > 0)

/** 仅显示语言列表里有的项（供 UiTabs 使用） */
const langTabs = computed(() =>
  JSON_TYPE_LANGUAGES.map((item) => ({ label: item.label, value: item.id }))
)

/** 切换语言时套用该语言的默认命名风格 */
watch(lang, (value) => {
  naming.value = JSON_TYPE_DEFAULT_NAMING[value] || 'keep'
})

/** 统计随输入实时更新；解析失败时为全 0 */
const stats = computed(() => (hasInput.value ? summarizeTypeStats(input.value) : null))

/** 当前语言的类型定义；解析失败时 output 为空并展示 error */
const output = computed(() => {
  if (!hasInput.value) return ''
  try {
    return jsonToType(input.value, {
      lang: lang.value,
      naming: naming.value,
      indent: indent.value,
      typeName: typeName.value,
    })
  } catch {
    return ''
  }
})

/** 实时校验，错误信息就近展示（沿用 json.js 的行列定位文案） */
watch([input, lang, naming, indent, typeName], () => {
  if (!hasInput.value) {
    error.value = ''
    return
  }
  try {
    jsonToType(input.value, {
      lang: lang.value,
      naming: naming.value,
      indent: indent.value,
      typeName: typeName.value,
    })
    error.value = ''
  } catch (err) {
    error.value = err.message
  }
})

function loadSample() {
  input.value = SAMPLE
  typeName.value = 'Root'
}

function reset() {
  input.value = ''
  error.value = ''
  typeName.value = 'Root'
}
</script>

<template>
  <ToolShell
    title="JSON 转类型定义"
    description="粘贴任意 JSON，自动推断为 TypeScript、Go、Python、Java 与 C# 的类型定义。数组里的多个对象会自动合并字段并标记可选，纯本地计算。"
  >
    <UiCard>
      <UiSection title="输入 JSON">
        <UiTextarea
          v-model="input"
          :rows="9"
          mono
          placeholder='粘贴 JSON，例如：{"id":1,"name":"pocketBox","tags":["json"]}'
        />

        <div class="jt-types__bar">
          <UiButton @click="loadSample">
            <UiIcon name="sparkles" :size="15" />
            填入示例
          </UiButton>
          <UiButton variant="ghost" @click="reset">
            <UiIcon name="refresh" :size="15" />
            重置
          </UiButton>
        </div>

        <p v-if="error" class="jt-types__error">
          <UiIcon name="info" :size="15" />
          <span>{{ error }}</span>
        </p>
      </UiSection>

      <UiSection title="生成选项">
        <div class="jt-types__options">
          <!-- 用 div 而非 label 包裹：UiSelect 不转发 attrs，for/id 关联本就无效，
               直接用 span 做视觉标签 + aria-label 提供可访问名 -->
          <div class="jt-types__field">
            <span class="jt-types__label">顶层类型名</span>
            <UiInput v-model="typeName" aria-label="顶层类型名" placeholder="Root" clearable />
          </div>

          <div class="jt-types__field">
            <span class="jt-types__label">字段命名</span>
            <UiSelect v-model="naming" aria-label="字段命名" :options="JSON_TYPE_NAMINGS" />
          </div>

          <div class="jt-types__field">
            <span class="jt-types__label">缩进</span>
            <UiSelect v-model="indent" aria-label="缩进" :options="JSON_TYPE_INDENTS" />
          </div>
        </div>
        <p class="jt-types__note">
          切换语言会自动套用该语言的惯用命名：Go 与 C# 用 PascalCase、Python 用 snake_case、Java 用
          camelCase、TypeScript 保留原键名。Go 的 json tag 与 C# 的 JsonPropertyName
          特性始终保留原始键名；Python 保留字加下划线，C# 保留字加 @ 前缀。
        </p>
      </UiSection>

      <template v-if="hasInput">
        <UiSection v-if="stats && stats.types" title="结构概览">
          <div class="jt-types__stats">
            <div class="jt-types__stat">
              <span class="jt-types__stat-value">{{ stats.types }}</span>
              <span class="jt-types__stat-label">类型节点</span>
            </div>
            <div class="jt-types__stat">
              <span class="jt-types__stat-value">{{ stats.fields }}</span>
              <span class="jt-types__stat-label">字段总数</span>
            </div>
            <div class="jt-types__stat">
              <span class="jt-types__stat-value">{{ stats.maxDepth }}</span>
              <span class="jt-types__stat-label">最大层级</span>
            </div>
          </div>
        </UiSection>

        <div class="jt-types__tabs">
          <UiTabs v-model="lang" :tabs="langTabs" />
        </div>
        <UiSection
          v-if="output"
          :title="`${JSON_TYPE_LANGUAGES.find((l) => l.id === lang).label} 输出`"
        >
          <UiTextarea :model-value="output" :rows="14" mono readonly />
          <div class="jt-types__actions">
            <UiButton variant="secondary" size="sm" @click="copyText(output)">
              <UiIcon name="copy" :size="14" />
              复制代码
            </UiButton>
            <span class="jt-types__actions-hint">{{ output.split('\n').length }} 行</span>
          </div>
        </UiSection>
        <p v-else-if="error" class="jt-types__empty">
          修正输入中的 JSON 语法错误后即可生成类型定义
        </p>
      </template>

      <p v-else class="jt-types__empty">
        粘贴 JSON 后自动生成类型定义，或点上方「填入示例」快速预览
      </p>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
