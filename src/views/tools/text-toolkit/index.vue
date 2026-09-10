<script setup>
// 文本批处理页：行级清理 / 去重 / 排序 / 大小写转换 + 文本统计，纯本地计算
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { CASE_MODES, SORT_MODES, countText, processText } from '@/common/utils/text'
import { copyText } from '@/common/utils/copy'

const SAMPLE = `  苹果
香蕉

苹果
橙子
  西瓜  `

const source = ref(SAMPLE)
const trimLines = ref(true)
const removeEmptyLines = ref(true)
const uniqueLines = ref(false)
const sortMode = ref('none')
const caseMode = ref('none')

const options = computed(() => ({
  trimLines: trimLines.value,
  removeEmptyLines: removeEmptyLines.value,
  uniqueLines: uniqueLines.value,
  sortMode: sortMode.value,
  caseMode: caseMode.value,
}))

const output = computed(() => processText(source.value, options.value))
const sourceStats = computed(() => countText(source.value))
const resultStats = computed(() => countText(output.value))

const activeCount = computed(
  () =>
    [trimLines.value, removeEmptyLines.value, uniqueLines.value].filter(Boolean).length +
    [sortMode.value !== 'none', caseMode.value !== 'none'].filter(Boolean).length
)

function onSample() {
  source.value = SAMPLE
}

function onReset() {
  trimLines.value = true
  removeEmptyLines.value = true
  uniqueLines.value = false
  sortMode.value = 'none'
  caseMode.value = 'none'
}
</script>

<template>
  <ToolShell
    title="文本批处理"
    description="粘贴一段文本，按需清理空白、去空行、去重、排序并转换大小写，附字数与行数统计。全部在本地完成。"
  >
    <UiCard>
      <UiSection title="输入文本">
        <UiTextarea v-model="source" :rows="10" mono placeholder="在此粘贴需要处理的文本…" />
        <div class="toolkit__row">
          <div class="toolkit__stats">
            <UiTag variant="neutral">原文 {{ sourceStats.chars }} 字符</UiTag>
            <UiTag variant="neutral">原文 {{ sourceStats.lines }} 行</UiTag>
          </div>
          <div class="toolkit__actions">
            <UiButton variant="ghost" size="sm" @click="onSample">
              <UiIcon name="sparkles" :size="14" />
              填入示例
            </UiButton>
            <UiButton variant="ghost" size="sm" :disabled="!source" @click="source = ''">
              <UiIcon name="close" :size="14" />
              清空
            </UiButton>
          </div>
        </div>
      </UiSection>

      <UiSection
        title="处理选项"
        description="按下述固定顺序执行：去首尾空白 → 去空行 → 去重 → 排序 → 大小写"
      >
        <div class="toolkit__checks">
          <UiCheckbox v-model="trimLines">每行去除首尾空白</UiCheckbox>
          <UiCheckbox v-model="removeEmptyLines">移除空行</UiCheckbox>
          <UiCheckbox v-model="uniqueLines">去除重复行（保留首次出现）</UiCheckbox>
        </div>
        <div class="toolkit__fields">
          <div class="toolkit__field">
            <span class="toolkit__field-label">大小写</span>
            <UiSelect v-model="caseMode" :options="CASE_MODES" />
          </div>
          <div class="toolkit__field">
            <span class="toolkit__field-label">行排序</span>
            <UiSelect v-model="sortMode" :options="SORT_MODES" />
          </div>
          <UiButton variant="ghost" size="sm" :disabled="activeCount === 0" @click="onReset">
            <UiIcon name="refresh" :size="14" />
            恢复默认
          </UiButton>
        </div>
      </UiSection>

      <UiSection title="处理结果">
        <div class="toolkit__stats">
          <UiTag variant="neutral">字符 {{ resultStats.chars }}</UiTag>
          <UiTag variant="neutral">不含空白 {{ resultStats.charsNoSpace }}</UiTag>
          <UiTag variant="neutral">行 {{ resultStats.lines }}</UiTag>
          <UiTag variant="neutral">非空行 {{ resultStats.nonEmptyLines }}</UiTag>
          <UiTag variant="neutral">词 {{ resultStats.words }}</UiTag>
        </div>

        <pre v-if="output" class="toolkit__output">{{ output }}</pre>
        <p v-else class="toolkit__placeholder">没有可处理的内容。</p>

        <div class="toolkit__row">
          <p v-if="activeCount === 0 && source" class="toolkit__hint">
            未启用任何处理项，结果与原文一致。
          </p>
          <UiButton
            class="toolkit__submit"
            size="sm"
            :disabled="!output"
            @click="copyText(output, { successMsg: '处理结果已复制' })"
          >
            <UiIcon name="copy" :size="14" />
            复制结果
          </UiButton>
        </div>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
