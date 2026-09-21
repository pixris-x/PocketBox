<script setup>
// NanoID 风格短码批量生成
import { computed, ref } from 'vue'
import { copyText } from '@/common/utils/copy'
import { downloadText } from '@/common/utils/download'
import { ALPHABET_OPTIONS, alphabetSize, generateIds } from './scripts/generator'

const count = ref(8)
const size = ref(21)
const alphabetKey = ref('standard')
const groupSize = ref(0)

const GROUP_OPTIONS = [
  { label: '不分组', value: 0 },
  { label: '每 4 位一组', value: 4 },
  { label: '每 5 位一组', value: 5 },
  { label: '每 6 位一组', value: 6 },
]

const list = ref([])

// 单个 ID 的信息量：log2(字母表大小) × 长度，帮助判断抗碰撞能力
const entropyBits = computed(() => {
  const chars = alphabetSize(alphabetKey.value)
  return chars > 1 ? Math.floor(size.value * Math.log2(chars)) : 0
})

function generate() {
  list.value = generateIds(count.value, {
    size: size.value,
    alphabetKey: alphabetKey.value,
    groupSize: groupSize.value,
  })
}

function onCopyAll() {
  copyText(list.value.join('\n'))
}

function onDownload() {
  downloadText('ids.txt', list.value.join('\n'), 'text/plain;charset=utf-8')
}

// 首次进入自动生成一批
generate()
</script>

<template>
  <UiCard>
    <UiSection title="生成选项">
      <div class="nano-row">
        <span class="nano-row__label">长度</span>
        <UiSlider
          v-model="size"
          :min="4"
          :max="64"
          :step="1"
          show-value
          class="nano-row__control"
        />
      </div>
      <div class="nano-row">
        <span class="nano-row__label">数量</span>
        <UiSlider
          v-model="count"
          :min="1"
          :max="50"
          :step="1"
          show-value
          class="nano-row__control"
        />
      </div>
      <div class="nano-row">
        <span class="nano-row__label">字符集</span>
        <UiSelect v-model="alphabetKey" :options="ALPHABET_OPTIONS" class="nano-row__control" />
      </div>
      <div class="nano-row">
        <span class="nano-row__label">分组</span>
        <UiSelect v-model="groupSize" :options="GROUP_OPTIONS" class="nano-row__control" />
      </div>
      <p class="nano-hint">约 {{ entropyBits }} bit 信息量；21 位的默认字母表已足够常用场景</p>
      <div class="nano-actions">
        <UiButton @click="generate">
          <UiIcon name="shuffle" :size="15" />
          重新生成
        </UiButton>
      </div>
    </UiSection>

    <UiSection
      v-if="list.length"
      title="生成结果"
      :description="`共 ${list.length} 条，点击右侧按钮复制`"
    >
      <div class="nano-list">
        <div v-for="(id, index) in list" :key="index" class="nano-item">
          <code class="nano-item__code">{{ id }}</code>
          <UiButton variant="secondary" size="sm" @click="copyText(id)">
            <UiIcon name="copy" :size="14" />
            复制
          </UiButton>
        </div>
      </div>
      <div class="nano-actions">
        <UiButton variant="secondary" size="sm" @click="onCopyAll">
          <UiIcon name="copy" :size="14" />
          复制全部
        </UiButton>
        <UiButton variant="ghost" size="sm" @click="onDownload">
          <UiIcon name="download" :size="14" />
          下载 .txt
        </UiButton>
      </div>
    </UiSection>
  </UiCard>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
