<script setup>
// 时间戳 ↔ 日期转换页
import { ref, computed, watch } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import {
  tsToDate,
  dateToLocalString,
  dateToUtcString,
  dateToIsoString,
  dateToTs,
  nowTs,
  isValidTimestamp,
} from '@/common/utils/timestamp'

// ---- 时间戳 → 日期 ----
const tsInput = ref('')
const tsMode = ref('seconds') // seconds | ms

const tsSeconds = computed(() => {
  const raw = Number(tsInput.value)
  if (!tsInput.value || Number.isNaN(raw)) return null
  return tsMode.value === 'seconds' ? raw : Math.floor(raw / 1000)
})

const dateInfo = computed(() => {
  const raw = Number(tsInput.value)
  if (!isValidTimestamp(raw)) return null
  const date = tsToDate(raw, { ms: tsMode.value === 'ms' })
  return {
    local: dateToLocalString(date),
    utc: dateToUtcString(date),
    iso: dateToIsoString(date),
  }
})

const tsModeOptions = [
  { label: '秒 (10 位)', value: 'seconds' },
  { label: '毫秒 (13 位)', value: 'ms' },
]

// ---- 日期 → 时间戳 ----
const dateInput = ref('')
const dateInfo2 = computed(() => {
  if (!dateInput.value) return null
  const ts = dateToTs(dateInput.value, { ms: false })
  if (ts === null) return null
  return { seconds: ts, ms: ts * 1000 }
})
const dateError = computed(() => (dateInput.value && !dateInfo2.value ? '无法解析该日期格式' : ''))

function setNow() {
  tsInput.value = String(nowTs())
  dateInput.value = dateToLocalString(new Date())
}

// 日期解析示例
const examples = [
  { label: '当前时间', value: dateToLocalString(new Date()) },
  { label: '今天 00:00:00', value: dateToLocalString(new Date(new Date().setHours(0, 0, 0, 0))) },
  {
    label: '明天 00:00:00',
    value: dateToLocalString(new Date(new Date().setHours(0, 0, 0, 0) + 86400000)),
  },
]

watch(tsInput, () => {
  if (isValidTimestamp(Number(tsInput.value))) {
    const date = tsToDate(Number(tsInput.value), { ms: tsMode.value === 'ms' })
    dateInput.value = dateToLocalString(date)
  }
})
</script>

<template>
  <ToolShell
    title="时间戳转换"
    description="Unix 时间戳与日期时间互转，支持秒 / 毫秒，显示本地、UTC 与 ISO 格式。"
  >
    <UiCard>
      <UiSection title="时间戳 → 日期">
        <div class="ts-row">
          <UiInput
            v-model="tsInput"
            placeholder="输入时间戳，如 1700000000"
            mono
            clearable
            class="ts-row__input"
          />
          <UiSelect v-model="tsMode" :options="tsModeOptions" />
          <UiButton variant="ghost" size="sm" @click="setNow">
            <UiIcon name="clock" :size="14" />
            使用当前时间
          </UiButton>
        </div>

        <div v-if="tsSeconds !== null" class="ts-result">
          <p class="ts-result__note">该时间戳约等于 {{ dateInfo ? '以下日期' : '超出合理范围' }}</p>
          <div v-if="dateInfo" class="ts-result__lines">
            <div class="ts-result__line">
              <span class="ts-result__label">本地时间</span>
              <code class="ts-result__value">{{ dateInfo.local }}</code>
            </div>
            <div class="ts-result__line">
              <span class="ts-result__label">UTC 时间</span>
              <code class="ts-result__value">{{ dateInfo.utc }}</code>
            </div>
            <div class="ts-result__line">
              <span class="ts-result__label">ISO 8601</span>
              <code class="ts-result__value">{{ dateInfo.iso }}</code>
            </div>
          </div>
        </div>
      </UiSection>

      <UiDivider />

      <UiSection title="日期 → 时间戳">
        <div class="ts-row">
          <UiInput
            v-model="dateInput"
            placeholder="输入日期，如 2023-11-14 22:13:20"
            mono
            clearable
            class="ts-row__input"
          />
        </div>
        <p v-if="dateError" class="ts-error">{{ dateError }}</p>

        <div v-if="dateInfo2" class="ts-result">
          <div class="ts-result__line">
            <span class="ts-result__label">秒 (10 位)</span>
            <code class="ts-result__value">{{ dateInfo2.seconds }}</code>
          </div>
          <div class="ts-result__line">
            <span class="ts-result__label">毫秒 (13 位)</span>
            <code class="ts-result__value">{{ dateInfo2.ms }}</code>
          </div>
        </div>

        <div class="ts-examples">
          <span class="ts-examples__label">快捷示例：</span>
          <button
            v-for="ex in examples"
            :key="ex.label"
            type="button"
            class="ts-examples__btn"
            @click="dateInput = ex.value"
          >
            {{ ex.label }}
          </button>
        </div>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
