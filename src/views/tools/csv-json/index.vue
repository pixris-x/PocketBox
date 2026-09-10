<script setup>
// CSV ↔ JSON 互转页：双向转换，支持分隔符、表头与类型推断选项
import { computed, ref, watch } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { DELIMITERS, csvToJson, findRaggedRows, jsonToCsv } from '@/common/utils/csv'
import { parseJson } from '@/common/utils/json'
import { copyText } from '@/common/utils/copy'

const CSV_SAMPLE = `姓名,年龄,城市
张三,28,北京
李四,35,上海
王五,42,广州`

const JSON_SAMPLE = `[
  { "name": "张三", "age": 28, "city": "北京" },
  { "name": "李四", "age": 35, "city": "上海" }
]`

const DIRECTIONS = [
  { label: 'CSV → JSON', value: 'csv2json' },
  { label: 'JSON → CSV', value: 'json2csv' },
]

const direction = ref('csv2json')
const delimiter = ref(',')
const hasHeader = ref(true)
const inferTypes = ref(false)
const includeHeader = ref(true)
const source = ref(CSV_SAMPLE)

function sampleOf(target) {
  return target === 'csv2json' ? CSV_SAMPLE : JSON_SAMPLE
}

// 切换方向时只在「输入为空」或「仍是另一个方向的示例」时才替换，
// 避免用户已经粘贴的内容被无声清掉
watch(direction, (_next, previous) => {
  if (source.value.trim() === '' || source.value === sampleOf(previous)) {
    source.value = sampleOf(direction.value)
  }
})

const result = computed(() => {
  if (!source.value.trim()) return { text: '', error: '' }
  try {
    if (direction.value === 'csv2json') {
      const records = csvToJson(source.value, {
        delimiter: delimiter.value,
        hasHeader: hasHeader.value,
        inferTypes: inferTypes.value,
      })
      return { text: JSON.stringify(records, null, 2), error: '' }
    }
    return {
      text: jsonToCsv(parseJson(source.value), {
        delimiter: delimiter.value,
        includeHeader: includeHeader.value,
      }),
      error: '',
    }
  } catch (err) {
    return { text: '', error: err instanceof Error ? err.message : String(err) }
  }
})

// 列数不齐是 CSV 最常见的脏数据，提示但不阻断转换
const ragged = computed(() => {
  if (direction.value !== 'csv2json' || !source.value.trim()) return null
  const { ragged: list, width } = findRaggedRows(source.value, delimiter.value)
  return list.length ? { list, width } : null
})

function onSample() {
  source.value = sampleOf(direction.value)
}
</script>

<template>
  <ToolShell
    title="CSV ↔ JSON 互转"
    description="表格数据与 JSON 双向转换。支持双引号包裹、字段内逗号与换行、自定义分隔符，全部在本地完成。"
  >
    <UiCard>
      <UiSection title="转换方向">
        <div class="csvjson__tabs">
          <UiTabs v-model="direction" :tabs="DIRECTIONS" />
        </div>

        <div class="csvjson__options">
          <div class="csvjson__field">
            <span class="csvjson__field-label">分隔符</span>
            <UiSelect v-model="delimiter" :options="DELIMITERS" />
          </div>
          <UiCheckbox v-if="direction === 'csv2json'" v-model="hasHeader">首行是表头</UiCheckbox>
          <UiCheckbox v-if="direction === 'csv2json'" v-model="inferTypes">
            按内容推断类型（数字 / 布尔 / null）
          </UiCheckbox>
          <UiCheckbox v-else v-model="includeHeader">输出包含表头行</UiCheckbox>
        </div>

        <p v-if="ragged" class="csvjson__warn">
          <UiIcon name="alert-triangle" :size="14" />
          有 {{ ragged.list.length }} 行列数与首行不一致（首行 {{ ragged.width }} 列），例如第
          {{ ragged.list[0].line }} 行是
          {{ ragged.list[0].length }} 列。超出表头的列会以「列N」命名。
        </p>
      </UiSection>

      <UiSection title="输入">
        <UiTextarea v-model="source" :rows="10" mono placeholder="在此粘贴 CSV 或 JSON…" />
        <div class="csvjson__row">
          <span class="csvjson__hint">共 {{ source.length }} 个字符</span>
          <div class="csvjson__actions">
            <UiButton variant="ghost" size="sm" @click="onSample">
              <UiIcon name="sparkles" :size="14" />
              填入示例
            </UiButton>
            <UiButton variant="ghost" size="sm" :disabled="!source" @click="source = ''">
              <UiIcon name="close" :size="14" />
              清空
            </UiButton>
          </div>
        </div>
      </UiSection>

      <UiSection title="转换结果">
        <p v-if="result.error" class="csvjson__error">
          <UiIcon name="alert-circle" :size="14" />
          {{ result.error }}
        </p>
        <pre v-else-if="result.text" class="csvjson__output">{{ result.text }}</pre>
        <p v-else class="csvjson__placeholder">没有可转换的内容。</p>

        <div class="csvjson__row">
          <UiButton
            class="csvjson__submit"
            size="sm"
            :disabled="!result.text"
            @click="copyText(result.text, { successMsg: '转换结果已复制' })"
          >
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
