<script setup>
// Cron 表达式解析：字段拆解 + 中文描述 + 未来执行时间预测，纯本地计算
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { describeCron, getCronNextRuns, parseCron } from '@/common/utils/cron'

const PRESETS = [
  { label: '每分钟', expr: '* * * * *' },
  { label: '每小时 0 分', expr: '0 * * * *' },
  { label: '每天 09:00', expr: '0 9 * * *' },
  { label: '工作日 09:00', expr: '0 9 * * 1-5' },
  { label: '每月 1 日零点', expr: '0 0 1 * *' },
  { label: '每 15 分钟', expr: '*/15 * * * *' },
]

const expression = ref('0 9 * * 1-5')
const anchor = ref(new Date())

const parsed = computed(() => parseCron(expression.value))
const description = computed(() => describeCron(parsed.value))

const fieldRows = computed(() => {
  if (!parsed.value.ok) return []
  const defs = [
    { key: 'minute', label: '分钟', range: '0-59' },
    { key: 'hour', label: '小时', range: '0-23' },
    { key: 'dom', label: '日', range: '1-31' },
    { key: 'month', label: '月', range: '1-12' },
    { key: 'dow', label: '星期', range: '0-7（0 与 7 都是周日）' },
  ]
  return defs.map((def) => {
    const field = parsed.value.fields[def.key]
    return {
      ...def,
      raw: parsed.value.expression.split(/\s+/)[defs.indexOf(def)],
      wildcard: field.wildcard,
      values: field.wildcard ? '任意值' : field.values.join('、'),
    }
  })
})

const nextRuns = computed(() => {
  if (!parsed.value.ok) return []
  try {
    return getCronNextRuns(expression.value, anchor.value, 5).map((date) => {
      const pad = (n) => String(n).padStart(2, '0')
      const week = '日一二三四五六'[date.getDay()]
      return {
        key: date.getTime(),
        text: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`,
        week: `周${week}`,
      }
    })
  } catch {
    return []
  }
})

function onPreset(expr) {
  expression.value = expr
}

function onRefresh() {
  anchor.value = new Date()
}
</script>

<template>
  <ToolShell
    title="Cron 表达式解析"
    description="拆解 5 段 Cron 表达式（分 时 日 月 周）的字段含义，并预测未来的执行时间。支持 *、范围、步进、列表、英文月 / 周名与 @宏。全部在本地完成。"
  >
    <UiCard>
      <UiSection title="表达式">
        <div class="cron__input-row">
          <UiInput v-model="expression" placeholder="例如：0 9 * * 1-5" />
          <UiButton variant="ghost" size="sm" @click="onRefresh">
            <UiIcon name="refresh" :size="14" />
            刷新时间
          </UiButton>
        </div>
        <div class="cron__presets">
          <UiButton
            v-for="preset in PRESETS"
            :key="preset.expr"
            variant="ghost"
            size="sm"
            @click="onPreset(preset.expr)"
          >
            {{ preset.label }}
          </UiButton>
        </div>
        <p v-if="parsed.macro" class="cron__macro">
          宏 {{ parsed.macro }} 等价于 <code>{{ parsed.expression }}</code>
        </p>
      </UiSection>
    </UiCard>

    <UiCard>
      <UiSection v-if="parsed.ok" title="解析结果">
        <p class="cron__description">{{ description }}</p>

        <div class="cron__table-wrap">
          <table class="cron__table">
            <thead>
              <tr>
                <th>字段</th>
                <th>原始值</th>
                <th>取值</th>
                <th>合法范围</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in fieldRows" :key="row.key">
                <td>{{ row.label }}</td>
                <td>
                  <code>{{ row.raw }}</code>
                </td>
                <td>{{ row.values }}</td>
                <td class="cron__muted">{{ row.range }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="cron__note">
          「日」与「星期」同时受限时按 vixie cron 规则取「或」：任意一个命中即执行。
        </p>
      </UiSection>

      <UiSection v-else title="解析失败">
        <p class="cron__error">{{ parsed.error }}</p>
      </UiSection>
    </UiCard>

    <UiCard v-if="parsed.ok">
      <UiSection title="未来 5 次执行" description="以当前时间（或点击刷新后的时间）为起点预测">
        <ol v-if="nextRuns.length" class="cron__runs">
          <li v-for="run in nextRuns" :key="run.key" class="cron__run">
            <code>{{ run.text }}</code>
            <UiTag variant="neutral">{{ run.week }}</UiTag>
          </li>
        </ol>
        <p v-else class="cron__error">
          10 年内没有匹配的执行时间——请检查表达式的日 / 月组合（例如 2 月 30 日）。
        </p>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
