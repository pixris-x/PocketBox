<script setup>
// HTML 实体转义 / 反转义页
import { computed, ref } from 'vue'
import { copyText } from '@/common/utils/copy'
import { downloadText } from '@/common/utils/download'
import {
  analyzeHtml,
  escapeHtml,
  escapeHtmlNonAscii,
  unescapeHtml,
  unknownEntities,
} from '@/common/utils/html-entity'

const input = ref('')
const output = ref('')
const nonAsciiOnly = ref(false)
// 记录本次输出的来源，用于结果区标题与「再点一次」的语义
const action = ref('')

const stats = computed(() => analyzeHtml(input.value))

function runEscape() {
  action.value = 'escape'
  output.value = nonAsciiOnly.value ? escapeHtmlNonAscii(input.value) : escapeHtml(input.value)
}

function runUnescape() {
  action.value = 'unescape'
  output.value = unescapeHtml(input.value)
}

// 未识别的实体只在反转义后提示，避免用户以为「没解码成功」——判定对象是输入里的实体
const unresolved = computed(() => (action.value === 'unescape' ? unknownEntities(input.value) : []))

const resultTitle = computed(() => (action.value === 'escape' ? '转义结果' : '反转义结果'))

function clearAll() {
  input.value = ''
  output.value = ''
  action.value = ''
}
</script>

<template>
  <UiCard>
    <UiSection title="输入">
      <UiTextarea v-model="input" placeholder="粘贴要转义或反转义的 HTML / 文本…" :rows="6" />
      <p class="ent-hint">输入含 {{ stats.specials }} 个需转义字符、{{ stats.entities }} 个实体</p>
      <div class="ent-check">
        <UiCheckbox v-model="nonAsciiOnly" />
        <span class="ent-check__text">转义时把所有非 ASCII 字符也转为数字实体（邮件模板常用）</span>
      </div>
    </UiSection>

    <div class="ent-actions">
      <UiButton @click="runEscape">
        <UiIcon name="code" :size="15" />
        转义为实体
      </UiButton>
      <UiButton variant="secondary" @click="runUnescape">
        <UiIcon name="code" :size="15" />
        还原为文本
      </UiButton>
      <UiButton variant="ghost" @click="clearAll">
        <UiIcon name="close" :size="15" />
        清空
      </UiButton>
    </div>

    <UiSection v-if="output" :title="resultTitle">
      <UiTextarea :model-value="output" :rows="6" mono />
      <p v-if="unresolved.length" class="ent-warn">
        未识别的实体已原样保留：{{ unresolved.join(' ') }}
        （本工具只收录常用实体表，且要求写全分号，如 &amp;nbsp;）
      </p>
      <div class="ent-actions">
        <UiButton variant="secondary" size="sm" @click="copyText(output)">
          <UiIcon name="copy" :size="14" />
          复制结果
        </UiButton>
        <UiButton
          variant="ghost"
          size="sm"
          @click="downloadText('html-entity.txt', output, 'text/plain;charset=utf-8')"
        >
          <UiIcon name="download" :size="14" />
          下载为 .txt
        </UiButton>
      </div>
    </UiSection>
  </UiCard>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
