<script setup>
// 校验面板：身份证 / 银行卡 / 手机号的格式与校验位校验
import { computed, ref } from 'vue'
import { copyText } from '@/common/utils/copy'
import {
  VALIDATION_SAMPLES,
  idCardCheckDigit,
  validateBankCard,
  validateIdCard,
  validatePhone,
} from '@/common/utils/idcard-mask'

const idcard = ref(VALIDATION_SAMPLES.idcard)
const bankcard = ref(VALIDATION_SAMPLES.bankcard)
const phone = ref(VALIDATION_SAMPLES.phone)

const idResult = computed(() => (idcard.value.trim() ? validateIdCard(idcard.value) : null))
const bankResult = computed(() => (bankcard.value.trim() ? validateBankCard(bankcard.value) : null))
const phoneResult = computed(() => (phone.value.trim() ? validatePhone(phone.value) : null))

/** 身份证校验位建议：把输错的末位换成算法算出的那一位 */
const idSuggestion = computed(() => {
  const result = idResult.value
  if (!result || result.is15 || result.valid) return null
  const text = idcard.value.replace(/\s/g, '').toUpperCase()
  if (!/^[0-9]{17}[0-9X]$/.test(text)) return null
  return idCardCheckDigit(text.slice(0, 17))
})

/** 抽样信息：地区 / 生日 / 性别 / 年龄 */
const idFacts = computed(() => {
  const result = idResult.value
  if (!result?.valid) return []
  return [
    { label: '签发地区', value: `${result.province}（${result.cityCode}）` },
    { label: '出生日期', value: result.birthText },
    { label: '性别', value: result.gender },
    { label: '年龄', value: result.age === null ? '—' : `${result.age} 岁` },
  ]
})

function reset() {
  idcard.value = ''
  bankcard.value = ''
  phone.value = ''
}
</script>

<template>
  <UiCard>
    <UiSection title="身份证校验" description="按 GB 11643 校验位规则，并抽出地区、出生日期与性别">
      <UiInput v-model="idcard" placeholder="18 位或 15 位身份证号，可含空格" clearable mono />
      <UiButton variant="ghost" size="sm" @click="idcard = VALIDATION_SAMPLES.idcard">
        <UiIcon name="sparkles" :size="14" />
        示例
      </UiButton>

      <div v-if="idResult" class="idm-result">
        <UiTag v-if="idResult.valid" variant="success">校验通过</UiTag>
        <UiTag v-else variant="danger">校验不通过</UiTag>
        <span class="idm-reason">{{ idResult.reason }}</span>
      </div>

      <p v-if="idSuggestion" class="idm-suggest">
        末位应为
        <b class="idm-suggest__digit">{{ idSuggestion }}</b>
        <UiButton
          variant="ghost"
          size="sm"
          @click="copyText(idcard.replace(/\s/g, '').slice(0, 17) + idSuggestion)"
        >
          <UiIcon name="copy" :size="14" />
          复制修正后的号码
        </UiButton>
      </p>

      <ul v-if="idFacts.length" class="idm-facts">
        <li v-for="fact in idFacts" :key="fact.label" class="idm-fact">
          <span class="idm-fact-label">{{ fact.label }}</span>
          <span class="idm-fact-value">{{ fact.value }}</span>
        </li>
      </ul>
    </UiSection>
  </UiCard>

  <UiCard>
    <UiSection title="银行卡校验" description="Luhn 校验位与卡组织识别">
      <UiInput v-model="bankcard" placeholder="银行卡号，可含空格或连字符" clearable mono />
      <UiButton variant="ghost" size="sm" @click="bankcard = VALIDATION_SAMPLES.bankcard">
        <UiIcon name="sparkles" :size="14" />
        示例
      </UiButton>

      <div v-if="bankResult" class="idm-result">
        <UiTag v-if="bankResult.valid" variant="success">校验通过</UiTag>
        <UiTag v-else variant="danger">校验不通过</UiTag>
        <span class="idm-reason">{{ bankResult.reason }}</span>
        <UiTag v-if="bankResult.brand" variant="info">{{ bankResult.brand }}</UiTag>
      </div>
    </UiSection>
  </UiCard>

  <UiCard>
    <UiSection title="手机号校验" description="大陆号段与位数，附运营商识别">
      <UiInput v-model="phone" placeholder="11 位手机号，可带 +86" clearable mono />
      <UiButton variant="ghost" size="sm" @click="phone = VALIDATION_SAMPLES.phone">
        <UiIcon name="sparkles" :size="14" />
        示例
      </UiButton>

      <div v-if="phoneResult" class="idm-result">
        <UiTag v-if="phoneResult.valid" variant="success">格式正确</UiTag>
        <UiTag v-else variant="danger">格式有误</UiTag>
        <span class="idm-reason">{{ phoneResult.reason }}</span>
        <UiTag v-if="phoneResult.operator && phoneResult.valid" variant="info">
          {{ phoneResult.operator }}
        </UiTag>
      </div>
    </UiSection>

    <UiSection spaced="false">
      <UiButton variant="ghost" size="sm" @click="reset">
        <UiIcon name="refresh" :size="14" />
        清空全部
      </UiButton>
    </UiSection>
  </UiCard>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
