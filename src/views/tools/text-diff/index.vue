<script setup>
// 文本 diff 对比页
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { diffText } from '@/common/utils/diff'

const left = ref(`苹果
香蕉
橙子
西瓜`)
const right = ref(`苹果
橙子
西瓜
芒果`)

const ignoreCase = ref(false)
const ignoreWhitespace = ref(false)

const result = computed(() =>
  diffText(left.value, right.value, {
    ignoreCase: ignoreCase.value,
    ignoreWhitespace: ignoreWhitespace.value,
  })
)

const isIdentical = computed(
  () => result.value.stats.added === 0 && result.value.stats.removed === 0
)

function onSwap() {
  const temp = left.value
  left.value = right.value
  right.value = temp
}

function onClear() {
  left.value = ''
  right.value = ''
}
</script>

<template>
  <ToolShell
    title="文本 diff 对比"
    description="逐行对比两段文本的差异，标出新增与删除的行，纯本地计算。"
  >
    <UiCard>
      <UiSection title="对比选项">
        <div class="diff-options">
          <UiCheckbox v-model="ignoreCase">忽略大小写</UiCheckbox>
          <UiCheckbox v-model="ignoreWhitespace">忽略空白差异</UiCheckbox>
        </div>
      </UiSection>

      <UiSection title="输入文本">
        <div class="diff-inputs">
          <div class="diff-inputs__col">
            <span class="diff-inputs__label">原始文本</span>
            <UiTextarea v-model="left" :rows="8" mono placeholder="粘贴原始文本…" />
          </div>
          <div class="diff-inputs__col">
            <span class="diff-inputs__label">对比文本</span>
            <UiTextarea v-model="right" :rows="8" mono placeholder="粘贴对比后的文本…" />
          </div>
        </div>
        <div class="diff-actions">
          <UiButton variant="secondary" size="sm" @click="onSwap">
            <UiIcon name="shuffle" :size="14" />
            交换左右
          </UiButton>
          <UiButton variant="ghost" size="sm" @click="onClear">
            <UiIcon name="close" :size="14" />
            清空
          </UiButton>
        </div>
      </UiSection>

      <UiSection title="对比结果">
        <div class="diff-stats">
          <UiTag variant="success">新增 {{ result.stats.added }} 行</UiTag>
          <UiTag variant="danger">删除 {{ result.stats.removed }} 行</UiTag>
          <UiTag variant="neutral">相同 {{ result.stats.same }} 行</UiTag>
          <UiTag v-if="isIdentical" variant="primary">内容完全一致</UiTag>
        </div>

        <div v-if="result.rows.length" class="diff-view">
          <div
            v-for="(row, index) in result.rows"
            :key="index"
            class="diff-line"
            :class="`diff-line--${row.type}`"
          >
            <span class="diff-line__sign">
              {{ row.type === 'add' ? '+' : row.type === 'remove' ? '-' : ' ' }}
            </span>
            <code class="diff-line__text">{{
              row.type === 'remove' ? row.leftText : row.rightText
            }}</code>
          </div>
        </div>
        <p v-else class="diff-empty">两侧都没有内容。</p>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
