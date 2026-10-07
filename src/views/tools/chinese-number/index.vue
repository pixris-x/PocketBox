<script setup>
// 人民币金额大写页：数字 → 大写、大写 → 数字双向互转
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import {
  CURRENCY_SAMPLES,
  chineseCurrencyToNumber,
  numberToChineseCurrency,
  numberToChineseNumber,
} from '@/common/utils/chinese-number'

const numberInput = ref('1234.56')
const chineseInput = ref('')

/** 数字 → 大写；输入非数字时留空并提示 */
const chineseOutput = computed(() => {
  const text = numberInput.value.trim()
  if (!text) return ''
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null // null 表示格式错误
  return numberToChineseCurrency(text)
})

/** 大写 → 数字 */
const numberOutput = computed(() => {
  const text = chineseInput.value.trim()
  if (!text) return null
  return chineseCurrencyToNumber(text)
})

/** 非整数部分给出读法（用于「第几名」这类场景） */
const plainReading = computed(() => {
  const text = numberInput.value.trim()
  if (!/^-?\d+$/.test(text)) return ''
  return numberToChineseNumber(text)
})

const numberError = computed(() =>
  numberInput.value.trim() && !/^-?\d+(\.\d+)?$/.test(numberInput.value.trim())
    ? '请输入数字，可含负号与两位小数'
    : ''
)

function useSample(value) {
  numberInput.value = String(value)
  chineseInput.value = ''
}
</script>

<template>
  <ToolShell
    title="人民币金额大写"
    description="按《正确填写票据和结算凭证的基本规定》把金额转成壹贰叁肆伍陆柒捌玖拾佰仟万亿的大写，也能反过来把大写还原成数字。零的处理遵循规范，纯本地计算。"
  >
    <UiCard>
      <UiSection title="数字转大写" description="支持负数与两位小数">
        <UiInput v-model="numberInput" placeholder="如 1234.56" clearable mono />

        <div class="cnum-samples">
          <UiButton
            v-for="item in CURRENCY_SAMPLES"
            :key="item.label"
            variant="ghost"
            size="sm"
            @click="useSample(item.value)"
          >
            {{ item.label }}
          </UiButton>
        </div>

        <p v-if="numberError" class="cnum-error">
          <UiIcon name="info" :size="15" />
          <span>{{ numberError }}</span>
        </p>

        <template v-if="chineseOutput">
          <div class="cnum-result">
            <code class="cnum-result__value">{{ chineseOutput }}</code>
            <UiButton variant="ghost" size="sm" @click="copyText(chineseOutput)">
              <UiIcon name="copy" :size="14" />
              复制
            </UiButton>
          </div>
          <p v-if="plainReading" class="cnum-plain">
            纯数字读法：<b>{{ plainReading }}</b>
          </p>
        </template>
      </UiSection>
    </UiCard>

    <UiCard>
      <UiSection
        title="大写转数字"
        description="录入票据时把大写金额还原成数字；只接受规范写法，不做容错猜测"
      >
        <UiInput v-model="chineseInput" placeholder="如 壹仟贰佰叁拾肆元伍角陆分" clearable mono />

        <div v-if="numberOutput" class="cnum-result">
          <template v-if="numberOutput.ok">
            <code class="cnum-result__value">{{ numberOutput.value }}</code>
            <UiTag v-if="numberOutput.text" variant="neutral">{{ numberOutput.text }}</UiTag>
            <UiButton variant="ghost" size="sm" @click="copyText(String(numberOutput.value))">
              <UiIcon name="copy" :size="14" />
              复制
            </UiButton>
          </template>
          <template v-else>
            <UiTag variant="danger">无法解析</UiTag>
            <span class="cnum-error__text">{{ numberOutput.reason }}</span>
          </template>
        </div>
      </UiSection>
    </UiCard>

    <UiCard>
      <UiSection title="规范要点" spaced="false">
        <ul class="cnum-rules">
          <li><b>零</b>：中间有连续零只写一个，如 <code>壹万零壹元整</code></li>
          <li><b>整</b>：没有任何角分时才加，如 <code>壹拾元整</code>；有角分则不写</li>
          <li><b>拾</b>：整十不补零，如 <code>壹拾壹</code> 而非「壹拾零壹」</li>
          <li><b>节权</b>：万 / 亿 逐级组合，如 <code>壹亿贰仟叁佰肆拾伍万陆仟柒佰捌拾玖</code></li>
          <li><b>单位</b>：元位用「元」而非「圆」，角分同理</li>
        </ul>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
