<script setup>
// 日期计算器：两日期之差 + 日期加减（含工作日）
import { computed, ref } from 'vue'
import { copyText } from '@/common/utils/copy'
import { addToDate, diffDates, todayString } from '@/common/utils/date-calc'

const mode = ref('diff')
const tabs = [
  { label: '日期之差', value: 'diff' },
  { label: '日期加减', value: 'add' },
]

// ---- 日期之差 ----
const fromDate = ref('2024-01-01')
const toDate = ref(todayString())

const diffResult = computed(() => {
  try {
    return { ok: true, ...diffDates(fromDate.value, toDate.value) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ---- 日期加减 ----
const baseDate = ref(todayString())
const addAmount = ref(1)
const addUnit = ref('days')
const addOptions = [
  { value: 'days', label: '天' },
  { value: 'workdays', label: '工作日（跳过周末）' },
  { value: 'weeks', label: '周' },
  { value: 'months', label: '月' },
  { value: 'years', label: '年' },
]

const addResult = computed(() => {
  const n = Number(addAmount.value)
  if (!Number.isFinite(n) || n === 0) return { ok: false, error: '请输入非零整数' }
  try {
    return {
      ok: true,
      result: addToDate(baseDate.value, { [addUnit.value]: n }),
      input: n,
      unit: addUnit.value,
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

function quickSetToday() {
  const t = todayString()
  if (mode.value === 'diff') {
    toDate.value = t
  } else {
    baseDate.value = t
  }
}

function setMode(value) {
  mode.value = value
}
</script>

<template>
  <UiCard>
    <UiSection title="模式">
      <UiTabs :model-value="mode" :tabs="tabs" @update:model-value="setMode" />
    </UiSection>
  </UiCard>

  <UiCard v-if="mode === 'diff'">
    <UiSection title="起止日期">
      <div class="dc-row">
        <label class="dc-field">
          <span class="dc-field__label">起始</span>
          <input class="dc-input" type="date" v-model="fromDate" />
        </label>
        <span class="dc-row__sep">→</span>
        <label class="dc-field">
          <span class="dc-field__label">结束</span>
          <input class="dc-input" type="date" v-model="toDate" />
        </label>
        <button class="dc-today" type="button" @click="quickSetToday">今天</button>
      </div>
    </UiSection>
  </UiCard>

  <UiCard v-else>
    <UiSection title="基准日期与步进">
      <div class="dc-row dc-row--stack">
        <label class="dc-field">
          <span class="dc-field__label">基准日期</span>
          <input class="dc-input" type="date" v-model="baseDate" />
        </label>
        <div class="dc-step">
          <label class="dc-field dc-field--grow">
            <span class="dc-field__label">加减量（负数表示向前）</span>
            <input class="dc-input" type="number" v-model="addAmount" step="1" />
          </label>
          <label class="dc-field dc-field--grow">
            <span class="dc-field__label">单位</span>
            <UiSelect v-model="addUnit" :options="addOptions" />
          </label>
        </div>
      </div>
    </UiSection>
  </UiCard>

  <UiCard v-if="mode === 'diff'">
    <UiSection title="差值">
      <p v-if="!diffResult.ok" class="dc-error">
        <UiIcon name="alert-circle" :size="14" />
        {{ diffResult.error }}
      </p>
      <div v-else class="dc-diff">
        <p class="dc-diff__summary">
          <code class="dc-diff__from">{{ diffResult.from }}</code>
          <span class="dc-diff__op">{{
            diffResult.direction === 'backward' ? '早于' : '晚于'
          }}</span>
          <code class="dc-diff__to">{{ diffResult.to }}</code>
        </p>
        <p class="dc-diff__breakdown">
          <strong>{{ diffResult.breakdown }}</strong>
          <span class="dc-diff__total">（{{ diffResult.totalDays }} 天）</span>
        </p>
        <ul class="dc-list">
          <li class="dc-row-line">
            <span class="dc-row-line__label">年</span>
            <span class="dc-row-line__value">{{ diffResult.years }}</span>
          </li>
          <li class="dc-row-line">
            <span class="dc-row-line__label">月</span>
            <span class="dc-row-line__value">{{ diffResult.months }}</span>
          </li>
          <li class="dc-row-line">
            <span class="dc-row-line__label">日</span>
            <span class="dc-row-line__value">{{ diffResult.days }}</span>
          </li>
          <li class="dc-row-line">
            <span class="dc-row-line__label">总天数</span>
            <span class="dc-row-line__value">{{ diffResult.totalDays.toLocaleString() }}</span>
          </li>
        </ul>
      </div>
    </UiSection>
  </UiCard>

  <UiCard v-else>
    <UiSection title="结果">
      <p v-if="!addResult.ok" class="dc-error">
        <UiIcon name="alert-circle" :size="14" />
        {{ addResult.error }}
      </p>
      <div v-else class="dc-add">
        <p class="dc-add__line">
          <code class="dc-add__date">{{ baseDate }}</code>
          <span class="dc-add__op"
            >{{ addResult.input > 0 ? '+' : '' }}{{ addResult.input }}
            {{ addOptions.find((o) => o.value === addResult.unit)?.label }}</span
          >
        </p>
        <p class="dc-add__result">
          <UiIcon name="check-circle" :size="20" />
          <code class="dc-add__target">{{ addResult.result }}</code>
        </p>
        <UiButton
          variant="secondary"
          size="sm"
          @click="copyText(addResult.result, { successMsg: '已复制' })"
        >
          <UiIcon name="copy" :size="14" />
          复制结果
        </UiButton>
      </div>
    </UiSection>
  </UiCard>

  <UiCard class="dc-tip">
    <UiIcon name="info" :size="16" />
    <p>
      日期加减遵循"月末夹紧"约定：1月31日 + 1月 → 2月29日（闰年）或
      2月28日（非闰年）。工作日模式跳过周六周日。
    </p>
  </UiCard>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
