<script setup>
// 中文假文生成：随机生成占位用的中文测试文本，纯本地
import { ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { formatNumber } from '@/common/utils/format'
import { generateFakeText } from './scripts/fake-text'

const paragraphCount = ref(3)
const output = ref('')

function onGenerate() {
  output.value = generateFakeText({ paragraphs: paragraphCount.value })
}
</script>

<template>
  <ToolShell
    title="中文假文生成"
    description="生成中文占位文本（类似 Lorem Ipsum），用于原型、排版与测试数据填充。随机数来自 Web Crypto，纯本地生成。"
  >
    <UiCard>
      <UiSection title="生成选项">
        <div class="faketext__options">
          <label class="faketext__field">
            <span class="faketext__label">段落数（1-20）</span>
            <UiInput v-model.number="paragraphCount" type="number" :maxlength="3" />
          </label>
          <UiButton size="sm" @click="onGenerate">
            <UiIcon name="sparkles" :size="14" />
            生成
          </UiButton>
        </div>
      </UiSection>
    </UiCard>

    <UiCard v-if="output">
      <UiSection title="生成结果">
        <pre class="faketext__output">{{ output }}</pre>
        <div class="faketext__row">
          <UiTag variant="neutral">{{ formatNumber(output.length) }} 字符</UiTag>
          <UiButton
            size="sm"
            class="faketext__copy"
            @click="copyText(output, { successMsg: '假文已复制' })"
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
