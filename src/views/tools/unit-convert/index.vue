<script setup>
// 单位换算页：选定分类与源单位后，一次列出该分类下全部单位的换算结果
import { computed, ref, watch } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { UNIT_CATEGORIES, convertUnit } from './scripts/units'
import { formatSignificant } from '@/common/utils/format'
import { copyText } from '@/common/utils/copy'

const tabs = UNIT_CATEGORIES.map((item) => ({ label: item.label, value: item.id }))

const categoryId = ref(UNIT_CATEGORIES[0].id)
const category = computed(() => UNIT_CATEGORIES.find((item) => item.id === categoryId.value))
const sourceUnitId = ref(UNIT_CATEGORIES[0].defaultUnit)
const amount = ref('1')

// 切换分类后原单位已不存在，回到该分类的默认单位
watch(categoryId, () => {
  sourceUnitId.value = category.value.defaultUnit
})

const sourceOptions = computed(() =>
  category.value.units.map((unit) => ({ label: unit.label, value: unit.id }))
)

// 空输入与非法输入都视为「无值」，避免 Number('') === 0 造成满屏 0
const numericValue = computed(() => {
  const text = String(amount.value).trim()
  if (text === '') return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
})

const rows = computed(() =>
  category.value.units.map((unit) => {
    const result = convertUnit(numericValue.value, category.value, sourceUnitId.value, unit.id)
    return {
      id: unit.id,
      label: unit.label,
      value: result === null ? '—' : formatSignificant(result),
      isSource: unit.id === sourceUnitId.value,
    }
  })
)

function copyAll() {
  const text = rows.value.map((row) => `${row.label}: ${row.value}`).join('\n')
  copyText(text, { successMsg: '已复制全部换算结果' })
}
</script>

<template>
  <ToolShell
    title="单位换算"
    description="长度、重量、面积、体积、数据存储与温度的单位互转。输入一个数值，同分类下全部单位的对应值一次列全。"
  >
    <UiCard>
      <UiSection title="换算设置">
        <div class="unit__tabs">
          <UiTabs v-model="categoryId" :tabs="tabs" />
        </div>

        <div class="unit__fields">
          <div class="unit__field">
            <span class="unit__field-label">数值</span>
            <UiInput
              v-model="amount"
              class="unit__amount"
              type="number"
              placeholder="1"
              clearable
            />
          </div>
          <div class="unit__field">
            <span class="unit__field-label">源单位</span>
            <UiSelect v-model="sourceUnitId" :options="sourceOptions" />
          </div>
        </div>
      </UiSection>

      <UiSection title="换算结果" :description="category.note">
        <ul class="unit__list">
          <li
            v-for="row in rows"
            :key="row.id"
            class="unit__item"
            :class="{ 'is-source': row.isSource }"
          >
            <span class="unit__item-label">{{ row.label }}</span>
            <code class="unit__item-value">{{ row.value }}</code>
            <UiButton
              variant="ghost"
              size="sm"
              :disabled="row.value === '—'"
              @click="copyText(row.value, { successMsg: `已复制 ${row.label}` })"
            >
              <UiIcon name="copy" :size="14" />
            </UiButton>
          </li>
        </ul>

        <div class="unit__footer">
          <UiButton
            variant="secondary"
            size="sm"
            :disabled="numericValue === null"
            @click="copyAll"
          >
            <UiIcon name="copy" :size="14" />
            复制全部
          </UiButton>
        </div>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
