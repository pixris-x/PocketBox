<script setup>
// 命名风格转换页：把任意写法的标识符拆词后转成八种命名风格，纯本地计算
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { convertAllNamings, splitWords } from '@/common/utils/naming'
import { copyText } from '@/common/utils/copy'

const SAMPLE = 'user_profile_name'

const source = ref('')
const words = computed(() => splitWords(source.value))
const results = computed(() => convertAllNamings(source.value))

function copyAll() {
  const text = results.value.map((item) => `${item.label}: ${item.value}`).join('\n')
  copyText(text, { successMsg: '已复制全部风格' })
}
</script>

<template>
  <ToolShell
    title="命名风格转换"
    description="输入任意写法的标识符，自动拆词并转换为 camelCase、snake_case、kebab-case 等八种风格。支持 HTTPServer 这类缩写与中英混排。"
  >
    <UiCard>
      <UiSection title="输入标识符">
        <UiInput
          v-model="source"
          class="naming__input"
          placeholder="例如 user_profile_name"
          clearable
        >
          <template #prefix>
            <UiIcon class="naming__input-icon" name="type" :size="15" />
          </template>
        </UiInput>

        <div class="naming__meta">
          <span class="naming__meta-label">识别出的词</span>
          <div v-if="words.length" class="naming__words">
            <UiTag v-for="(word, index) in words" :key="`${index}-${word}`" variant="neutral">
              {{ word }}
            </UiTag>
          </div>
          <span v-else class="naming__hint">等待输入…</span>
          <UiButton variant="ghost" size="sm" @click="source = SAMPLE">
            <UiIcon name="sparkles" :size="14" />
            填入示例
          </UiButton>
        </div>
      </UiSection>

      <UiSection title="转换结果" description="拆词后按下述风格重新拼接，点击右侧按钮单独复制">
        <ul class="naming__list">
          <li v-for="item in results" :key="item.id" class="naming__item">
            <span class="naming__item-label">{{ item.label }}</span>
            <code class="naming__item-value">{{ item.value || '—' }}</code>
            <UiButton
              variant="ghost"
              size="sm"
              :disabled="!item.value"
              @click="copyText(item.value, { successMsg: `已复制 ${item.label}` })"
            >
              <UiIcon name="copy" :size="14" />
            </UiButton>
          </li>
        </ul>

        <div class="naming__footer">
          <UiButton variant="secondary" size="sm" :disabled="!source" @click="copyAll">
            <UiIcon name="copy" :size="14" />
            复制全部
          </UiButton>
        </div>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
