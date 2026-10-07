<script setup>
// 文本密码与编码页：ROT13 / 凯撒移位 / 摩斯电码 / Base58
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import {
  BASE58_ALPHABET,
  CIPHER_TYPES,
  MORSE_GAPS,
  base58Decode,
  base58Encode,
  caesarShift,
  morseToText,
  rot13,
  rot13LooksReadable,
  textToMorse,
} from '@/common/utils/cipher-text'

const SAMPLE = 'Hello, World! 123'

const type = ref('rot13')
const input = ref(SAMPLE)
const shift = ref(3)

/** CIPHER_TYPES 用 value，UiTabs 也要 value */
const cipherTabs = computed(() =>
  CIPHER_TYPES.map((item) => ({ label: item.label, value: item.value }))
)

/** 统一入口：每个算法都算出「结果 + 是否可逆」 */
const result = computed(() => {
  const text = input.value

  if (type.value === 'morse') {
    if (text.trim() && /[.\-\/]/.test(text)) {
      // 输入里已有摩斯符号 → 当作解码
      return { text: morseToText(text), reversed: true }
    }
    return { text: textToMorse(text), reversed: false }
  }

  if (type.value === 'base58') {
    const alphabet = /^[1-9A-HJ-NP-Za-km-z]+$/.test(text.trim()) && !/[.\-\s]/.test(text)
    if (alphabet) {
      try {
        return { text: new TextDecoder().decode(base58Decode(text)), reversed: true }
      } catch (err) {
        return { text: '', error: err instanceof Error ? err.message : '解码失败' }
      }
    }
    return { text: base58Encode(text), reversed: false }
  }

  if (type.value === 'caesar') {
    return { text: caesarShift(text, Number(shift.value) || 0), reversed: true }
  }

  const encoded = rot13(text)
  return {
    text: encoded,
    reversed: true,
    // ROT13 自反：结果再转一次就是原文
    hint: rot13LooksReadable(input.value)
      ? '这段原文可读，转出来多半是乱码'
      : '转出的结果更可能是原文',
  }
})

const isDecodeMode = computed(() => result.value.reversed === true)
</script>

<template>
  <ToolShell
    title="文本密码与编码"
    description="ROT13 与凯撒移位、摩斯电码、Base58 编解码。凯撒与摩斯只移动或转写 ASCII 字母，中文与标点原样保留；Base58 剔除了 0 O I l 四个易混字符，常用于比特币地址。纯本地计算。"
  >
    <UiCard>
      <UiSection title="算法">
        <UiTabs v-model="type" :tabs="cipherTabs" />
      </UiSection>

      <UiSection :title="isDecodeMode ? '输入（编码结果）' : '输入原文'">
        <UiTextarea v-model="input" :rows="6" mono placeholder="输入要处理的文本" />

        <div v-if="type === 'caesar'" class="cph-shift">
          <span class="cph-shift__label">位移量</span>
          <UiInput v-model="shift" type="number" class="cph-shift__input" />
          <UiButton variant="ghost" size="sm" @click="input = SAMPLE">
            <UiIcon name="sparkles" :size="14" />
            示例
          </UiButton>
        </div>
        <UiButton v-else variant="ghost" size="sm" @click="input = SAMPLE">
          <UiIcon name="sparkles" :size="14" />
          示例
        </UiButton>
      </UiSection>

      <UiSection title="结果">
        <template v-if="result.text">
          <UiTextarea :model-value="result.text" :rows="6" mono readonly />
          <div class="cph-actions">
            <UiButton variant="secondary" size="sm" @click="copyText(result.text)">
              <UiIcon name="copy" :size="14" />
              复制结果
            </UiButton>
            <UiButton variant="ghost" size="sm" @click="input = result.text">
              <UiIcon name="refresh" :size="14" />
              用结果再转一次
            </UiButton>
            <UiTag v-if="result.hint" variant="warning">{{ result.hint }}</UiTag>
          </div>
        </template>
        <p v-else-if="result.error" class="cph-error">
          <UiIcon name="info" :size="15" />
          <span>{{ result.error }}</span>
        </p>
        <p v-else class="cph-empty">输入内容后查看结果</p>
      </UiSection>

      <UiSection title="说明" spaced="false">
        <ul class="cph-notes">
          <li><b>ROT13</b>：位移 13，<b>自反</b>——转两次回到原文，因此不需要密钥。</li>
          <li>
            <b>凯撒移位</b>：只移动 ASCII 字母，数字、标点、中文原样保留； 位移 26
            的倍数等于不位移。
          </li>
          <li>
            <b>摩斯电码</b>：字母 {{ MORSE_GAPS.letter.trim() }} 分隔、单词双空格分隔；
            无法编码的字符会标成 ? 而不静默丢弃。
          </li>
          <li>
            <b>Base58</b>：字母表 {{ BASE58_ALPHABET }}，剔除了 <code>0</code> <code>O</code>
            <code>I</code> <code>l</code>，手抄不易出错。
          </li>
        </ul>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
