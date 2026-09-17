<script setup>
// CSV → Markdown 表格：复用 common/utils/csv.js 的 RFC 4180 解析，纯本地
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { csvToMarkdown } from '@/common/utils/md-table'
import { DELIMITERS } from '@/common/utils/csv'
import { copyText } from '@/common/utils/copy'

const SAMPLE = '姓名,部门,备注\n张三,研发,"擅长 JS|SQL"\n李四,设计,多\n行备注'

const input = ref(SAMPLE)
const delimiter = ref(',')
const align = ref('left')
const hasHeader = ref(true)

const output = computed(() =>
  csvToMarkdown(input.value, {
    delimiter: delimiter.value,
    align: align.value,
    header: hasHeader.value,
  })
)
</script>

<template>
  <ToolShell
    title="Markdown 表格"
    description="把 CSV 转成 Markdown 表格：支持引号转义、自定义分隔符与对齐方式，单元格内的竖线与换行会自动处理。全部本地完成。"
  >
    <UiCard>
      <UiSection title="输入 CSV">
        <UiTextarea v-model="input" :rows="8" mono placeholder="粘贴 CSV 文本，首行为表头…" />
        <div class="mdtable__fields">
          <div class="mdtable__field">
            <span class="mdtable__label">分隔符</span>
            <UiSelect v-model="delimiter" :options="DELIMITERS" />
          </div>
          <div class="mdtable__field">
            <span class="mdtable__label">对齐方式</span>
            <UiSelect
              v-model="align"
              :options="[
                { label: '左对齐', value: 'left' },
                { label: '居中', value: 'center' },
                { label: '右对齐', value: 'right' },
              ]"
            />
          </div>
          <UiCheckbox v-model="hasHeader">首行是表头</UiCheckbox>
        </div>
        <div class="mdtable__row">
          <UiButton variant="ghost" size="sm" @click="input = SAMPLE">
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
      <UiSection title="Markdown 输出">
        <pre v-if="output" class="mdtable__output">{{ output }}</pre>
        <p v-else class="mdtable__empty">没有可转换的内容。</p>
        <div class="mdtable__row">
          <UiButton
            size="sm"
            class="mdtable__copy"
            :disabled="!output"
            @click="copyText(output, { successMsg: 'Markdown 表格已复制' })"
          >
            <UiIcon name="copy" :size="14" />
            复制 Markdown
          </UiButton>
        </div>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
