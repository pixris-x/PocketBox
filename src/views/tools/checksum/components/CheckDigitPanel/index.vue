<script setup>
// 校验位面板：Luhn（银行卡 / IMEI 一类）与 ISBN-10 / ISBN-13
import { computed, ref } from 'vue'
import { copyText } from '@/common/utils/copy'
import {
  isbn10CheckDigit,
  isbn13CheckDigit,
  isbnValid,
  detectIsbn,
  luhnCheckDigit,
  luhnValid,
} from '@/common/utils/checksum'

const card = ref('4539 1488 0343 6467')
const book = ref('978-0-306-40615-')

/** 输入过程中随时可能不合法，统一吞掉异常换成中性状态，避免打字时面板闪断 */
function tryCheck(fn) {
  try {
    return fn()
  } catch {
    return null
  }
}

const cardClean = computed(() => card.value.replace(/[\s-]/g, ''))
const cardState = computed(() => {
  if (!cardClean.value) return null
  const valid = tryCheck(() => luhnValid(cardClean.value))
  // 主干 = 去掉末位（末位就是校验位），据此给出「应该是几」
  const suggested =
    cardClean.value.length >= 2
      ? tryCheck(() => luhnCheckDigit(cardClean.value.slice(0, -1)))
      : null
  return { valid, suggested }
})

const bookClean = computed(() => book.value.replace(/[\s-]/g, ''))
const bookState = computed(() => {
  if (!bookClean.value) return null
  const kind = detectIsbn(book.value)
  if (kind) {
    return { kind, valid: isbnValid(book.value), suggested: null }
  }
  // 前缀形态：9 位算 ISBN-10 校验位，12 位算 ISBN-13
  if (/^[0-9]{9}$/.test(bookClean.value)) {
    return {
      kind: 'isbn10',
      valid: null,
      suggested: tryCheck(() => isbn10CheckDigit(bookClean.value)),
    }
  }
  if (/^[0-9]{12}$/.test(bookClean.value)) {
    return {
      kind: 'isbn13',
      valid: null,
      suggested: tryCheck(() => isbn13CheckDigit(bookClean.value)),
    }
  }
  return { kind: null, valid: null, suggested: null }
})

const bookKindLabel = computed(() => {
  const kind = bookState.value?.kind
  if (kind === 'isbn10') return 'ISBN-10'
  if (kind === 'isbn13') return 'ISBN-13'
  return ''
})
</script>

<template>
  <UiCard>
    <UiSection title="Luhn 校验" description="银行卡号、IMEI、部分会员号用的加倍求和校验">
      <UiInput
        v-model="card"
        class="ckd-input"
        placeholder="输入完整号码，或只输入不含校验位的主干…"
      />
      <div v-if="cardState" class="ckd-result">
        <UiTag v-if="cardState.valid === true" variant="success">校验通过</UiTag>
        <UiTag v-else-if="cardState.valid === false" variant="danger">校验不通过</UiTag>
        <UiTag v-else variant="neutral">格式待修正</UiTag>
        <p v-if="cardState.suggested !== null" class="ckd-suggest">
          主干
          <code>{{ cardClean.slice(0, -1) }}</code> 的正确校验位是
          <b class="ckd-suggest__digit">{{ cardState.suggested }}</b>
          <UiButton
            v-if="!cardState.valid"
            variant="ghost"
            size="sm"
            @click="copyText(cardClean.slice(0, -1) + cardState.suggested)"
          >
            <UiIcon name="copy" :size="14" />
            复制修正后的号码
          </UiButton>
        </p>
      </div>
      <p v-else class="ckd-hint">号码只允许数字，可带空格或连字符分隔</p>
    </UiSection>
  </UiCard>

  <UiCard>
    <UiSection
      title="ISBN 校验"
      description="给出 10 位或 13 位判定真伪；给出 9 / 12 位前缀则算校验位"
    >
      <UiInput
        v-model="book"
        class="ckd-input"
        placeholder="如 978-0-306-40615-7 或前缀 978030640615"
      />
      <div v-if="bookState && (bookState.kind || bookState.suggested !== null)" class="ckd-result">
        <span class="ckd-kind">{{ bookKindLabel }}</span>
        <UiTag v-if="bookState.valid === true" variant="success">校验通过</UiTag>
        <UiTag v-else-if="bookState.valid === false" variant="danger">校验不通过</UiTag>
        <p v-if="bookState.suggested !== null" class="ckd-suggest">
          校验位应为
          <b class="ckd-suggest__digit">{{ bookState.suggested }}</b>
          <UiButton variant="ghost" size="sm" @click="copyText(String(bookState.suggested))">
            <UiIcon name="copy" :size="14" />
            复制
          </UiButton>
        </p>
      </div>
      <p v-else class="ckd-hint">ISBN-10 末位可以是 X；输入位数不对时不会给结论</p>
    </UiSection>
  </UiCard>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
