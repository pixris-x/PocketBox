<script setup>
// SQL 格式化页：关键字大写、子句换行、压缩成单行
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { formatSql, minifySql } from '@/common/utils/sql-format'

const SAMPLE = `select u.id, u.name, count(*) as cnt from users u left join orders o on o.user_id = u.id where u.status = 1 group by u.id, u.name having count(*) > 3 order by cnt desc limit 100`

const input = ref(SAMPLE)
const indent = ref(2)
const uppercase = ref(true)
const breakLines = ref(true)
const mode = ref('format')

const modeTabs = [
  { label: '格式化', value: 'format' },
  { label: '压缩单行', value: 'minify' },
]

const indentOptions = [
  { label: '2 空格', value: 2 },
  { label: '4 空格', value: 4 },
  { label: 'Tab', value: 'tab' },
]

const output = computed(() => {
  const text = input.value
  if (!text.trim()) return ''
  if (mode.value === 'minify') return minifySql(text)
  return formatSql(text, {
    indent: indent.value,
    uppercase: uppercase.value,
    breakLines: breakLines.value,
  })
})

const stats = computed(() => {
  const before = input.value
  const after = output.value
  if (!before.trim() || !after) return null
  return {
    beforeLines: before.split('\n').length,
    afterLines: after.split('\n').length,
    keywords: (after.match(/\b[A-Z]{2,}\b/g) || []).length,
  }
})
</script>

<template>
  <ToolShell
    title="SQL 格式化"
    description="关键字大写、主要子句各占一行、JOIN 与 AND 按括号深度缩进。字符串、注释、标识符（引号内）里的关键字不会被动。只排版不改语义，不校验语法。纯本地处理。"
  >
    <UiCard>
      <UiSection title="输入 SQL">
        <UiTextarea v-model="input" :rows="9" mono placeholder="粘贴 SQL" />
        <UiButton variant="ghost" size="sm" @click="input = SAMPLE">
          <UiIcon name="sparkles" :size="14" />
          填入示例
        </UiButton>
      </UiSection>

      <UiSection title="选项">
        <div class="sql-options">
          <div class="sql-field">
            <span class="sql-field__label">模式</span>
            <UiTabs v-model="mode" :tabs="modeTabs" />
          </div>

          <label v-if="mode === 'format'" class="sql-field">
            <span class="sql-field__label">缩进</span>
            <UiSelect v-model="indent" aria-label="缩进" :options="indentOptions" />
          </label>

          <div v-if="mode === 'format'" class="sql-field">
            <span class="sql-field__label">开关</span>
            <div class="sql-switches">
              <div class="sql-switch">
                <UiSwitch v-model="uppercase" />
                <span>关键字大写</span>
              </div>
              <div class="sql-switch">
                <UiSwitch v-model="breakLines" />
                <span>子句换行</span>
              </div>
            </div>
          </div>
        </div>
      </UiSection>

      <UiSection title="结果">
        <template v-if="output">
          <div v-if="stats" class="sql-stats">
            <UiTag variant="neutral">{{ stats.beforeLines }} → {{ stats.afterLines }} 行</UiTag>
            <UiTag variant="info">{{ stats.keywords }} 个关键字</UiTag>
          </div>
          <UiTextarea :model-value="output" :rows="12" mono readonly />
          <div class="sql-actions">
            <UiButton variant="secondary" size="sm" @click="copyText(output)">
              <UiIcon name="copy" :size="14" />
              复制 SQL
            </UiButton>
          </div>
        </template>
        <p v-else class="sql-empty">输入 SQL 后查看排版结果</p>
      </UiSection>

      <UiSection title="它不做什么" spaced="false">
        <ul class="sql-notes">
          <li>不校验语法，也不改写语义 —— 只调整空白与关键字大小写</li>
          <li>不处理数据库方言差异，按 MySQL / PostgreSQL 共有语法工作</li>
          <li>
            字符串、<code>--</code> 注释、<code>/* */</code> 注释、<code>&quot;引号&quot;</code>与
            <code>`反引号`</code>标识符内的内容原样保留
          </li>
        </ul>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
