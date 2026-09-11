<script setup>
// 进制转换页（2/8/10/16 实时互转 + 自定义目标进制）
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { BASE_PRESETS, formatInBase, parseInBase } from '@/common/utils/base-convert'

const fromOptions = [...BASE_PRESETS, { value: 'custom', label: '自定义 (2–36)' }]

const input = ref('')
const fromBase = ref(10)
const customFromBase = ref(36)
const customToBase = ref(2)
const showCustomFrom = computed(() => fromBase.value === 'custom')

const messageOf = (err) => (err instanceof Error ? err.message : String(err))

const actualFromBase = computed(() =>
  fromBase.value === 'custom' ? Number(customFromBase.value) : fromBase.value
)

// 一次解析 → 多进制展示，错误时清空
const parsed = computed(() => {
  const text = input.value.trim()
  if (!text) return { ok: true, value: 0n, empty: true }
  try {
    return { ok: true, value: parseInBase(text, actualFromBase.value), empty: false }
  } catch (err) {
    return { ok: false, error: messageOf(err) }
  }
})

const error = computed(() => (parsed.value.ok ? '' : parsed.value.error))

const commonResults = computed(() => {
  if (!parsed.value.ok || parsed.value.empty) return null
  const v = parsed.value.value
  return {
    2: v.toString(2),
    8: v.toString(8),
    10: v.toString(10),
    16: v.toString(16),
  }
})

const customToResult = computed(() => {
  if (!parsed.value.ok || parsed.value.empty) return ''
  try {
    return formatInBase(parsed.value.value, Number(customToBase.value))
  } catch (err) {
    return '（目标进制无效：' + messageOf(err) + '）'
  }
})

// 目标进制的下拉选项（2-36，标签同时显示十进制与十六进制字符上限）
// 目标进制的下拉选项（2-36）
const toOptions = computed(() => {
  const out = []
  for (let b = 2; b <= 36; b++) {
    out.push({ value: b, label: `${b} 进制` })
  }
  return out
})
</script>

<template>
  <ToolShell
    title="进制转换"
    description="在 2/8/10/16 进制间实时互转，支持任意 2–36 进制。整数任意精度，不存在 Number 类型的失真。"
  >
    <UiCard>
      <UiSection title="输入">
        <div class="bc-input-row">
          <UiTextarea v-model="input" placeholder="输入要转换的数字…" :rows="3" />
        </div>
        <div class="bc-options">
          <label class="bc-options__field">
            <span class="bc-options__label">来源进制</span>
            <UiSelect v-model="fromBase" :options="fromOptions" />
          </label>
          <label v-if="showCustomFrom" class="bc-options__field">
            <span class="bc-options__label">自定义 2–36</span>
            <UiInput v-model="customFromBase" type="number" placeholder="2-36" :min="2" :max="36" />
          </label>
        </div>
        <p v-if="showCustomFrom" class="bc-hint">
          从剪贴板复制时常见 <code>0x</code>/<code>0b</code>/<code>0o</code> 前缀会按进制自动剥离。
        </p>
      </UiSection>
    </UiCard>

    <UiCard v-if="error">
      <UiSection title="解析失败">
        <p class="bc-error">
          <UiIcon name="alert-circle" :size="14" />
          {{ error }}
        </p>
      </UiSection>
    </UiCard>

    <template v-else-if="commonResults">
      <UiCard>
        <UiSection title="转换结果">
          <ul class="bc-results">
            <li
              v-for="row in [
                { label: '二进制', value: commonResults[2] },
                { label: '八进制', value: commonResults[8] },
                { label: '十进制', value: commonResults[10] },
                { label: '十六进制', value: commonResults[16] },
              ]"
              :key="row.label"
              class="bc-result"
            >
              <span class="bc-result__label">{{ row.label }}</span>
              <code class="bc-result__code">{{ row.value }}</code>
              <UiButton
                variant="secondary"
                size="sm"
                @click="copyText(row.value, { successMsg: row.label + '已复制' })"
              >
                <UiIcon name="copy" :size="14" />
                复制
              </UiButton>
            </li>
          </ul>
        </UiSection>
      </UiCard>

      <UiCard>
        <UiSection title="目标进制（任意 2–36）">
          <div class="bc-to-row">
            <UiSelect v-model="customToBase" :options="toOptions" />
            <code class="bc-to-value">{{ customToResult }}</code>
            <UiButton
              variant="secondary"
              size="sm"
              @click="copyText(customToResult, { successMsg: '已复制' })"
            >
              <UiIcon name="copy" :size="14" />
              复制
            </UiButton>
          </div>
        </UiSection>
      </UiCard>
    </template>

    <UiCard class="bc-tip">
      <UiIcon name="info" :size="16" />
      <p>
        全部基于 JavaScript <code>BigInt</code> 实现，任意精度整数（超过 2⁵³
        的数也不会丢精度）。仅支持整数，不处理小数部分。
      </p>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
