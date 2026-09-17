<script setup>
// Unicode 字符查询：逐码点拆解 + 各种引用写法还原，纯本地
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { decodeRefs, encodeHtmlEntities, inspectText } from '@/common/utils/unicode'
import { copyText } from '@/common/utils/copy'

const text = ref('中文A😀')
const refInput = ref('U+4E2D \\u0041 &#x1F600;')

const chars = computed(() => inspectText(text.value))
const decoded = computed(() => decodeRefs(refInput.value))

function onCopyChar(char) {
  copyText(char, { successMsg: '字符已复制' })
}
</script>

<template>
  <ToolShell
    title="Unicode 字符查询"
    description="把文本逐码点拆开：查看码点、UTF-8 字节、HTML 实体与 JS 转义；也能把 U+4E2D、\\u4E2D、&#x4E2D; 等写法还原成字符。全部本地计算。"
  >
    <UiCard>
      <UiSection title="文本拆解">
        <UiTextarea
          v-model="text"
          :rows="2"
          mono
          placeholder="输入任意文本，emoji 也会按码点拆开"
        />
        <div v-if="chars.length" class="unicode__table-wrap">
          <table class="unicode__table">
            <thead>
              <tr>
                <th>字符</th>
                <th>码点</th>
                <th>UTF-8 字节</th>
                <th>HTML 实体</th>
                <th>JS 转义</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in chars" :key="item.codePoint + item.char">
                <td class="unicode__char">{{ item.char === ' ' ? '␠' : item.char }}</td>
                <td>
                  <code>{{ item.hex }}</code>
                </td>
                <td>
                  <code>{{
                    item.utf8.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')
                  }}</code>
                </td>
                <td>
                  <code>{{ encodeHtmlEntities(item.char, { escapeNonAscii: true }) }}</code>
                </td>
                <td>
                  <code>{{ item.jsEscape }}</code>
                </td>
                <td>
                  <UiButton variant="ghost" size="sm" @click="onCopyChar(item.char)">
                    <UiIcon name="copy" :size="14" />
                  </UiButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="unicode__empty">没有可拆解的字符。</p>
      </UiSection>
    </UiCard>

    <UiCard>
      <UiSection
        title="引用还原"
        description="支持混排：U+4E2D、\\u4E2D、\\u{1F600}、&#x4E2D;、&#20013;（分号可省略）"
      >
        <UiTextarea v-model="refInput" :rows="2" mono placeholder="例如 U+4E2D 或 &#x4E2D;" />
        <div v-if="decoded" class="unicode__decoded">
          <span class="unicode__label">还原结果</span>
          <code class="unicode__value">{{ decoded }}</code>
          <UiButton
            variant="ghost"
            size="sm"
            @click="copyText(decoded, { successMsg: '还原结果已复制' })"
          >
            <UiIcon name="copy" :size="14" />
            复制
          </UiButton>
        </div>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
