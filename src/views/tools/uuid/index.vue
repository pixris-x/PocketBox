<script setup>
// UUID v4 批量生成页
import { ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { downloadText } from '@/common/utils/download'

const count = ref(5)
const uppercase = ref(false)

function generateUuid() {
  // 优先 crypto.randomUUID；不支持时用 getRandomValues 手工构造 v4
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const list = ref([])

function generate() {
  const items = []
  for (let i = 0; i < count.value; i++) {
    const uuid = generateUuid()
    items.push(uppercase.value ? uuid.toUpperCase() : uuid)
  }
  list.value = items
}

function onCopyOne(uuid) {
  copyText(uuid)
}

function onCopyAll() {
  copyText(list.value.join('\n'))
}

function onDownload() {
  downloadText('uuids.txt', list.value.join('\n'), 'text/plain;charset=utf-8')
}

// 首次进入自动生成一批
generate()
</script>

<template>
  <ToolShell
    title="UUID 生成"
    description="批量生成 UUID v4（基于 crypto.randomUUID / Web Crypto）。"
  >
    <UiCard>
      <UiSection title="生成选项">
        <div class="uuid-row">
          <span class="uuid-row__label">生成数量</span>
          <UiSlider v-model="count" :min="1" :max="50" :step="1" show-value class="uuid-row__control" />
        </div>
        <div class="uuid-row">
          <span class="uuid-row__label">格式</span>
          <div class="uuid-switch">
            <UiSwitch v-model="uppercase" />
            <span class="uuid-switch__text">大写字母</span>
          </div>
        </div>
        <div class="uuid-actions">
          <UiButton @click="generate">
            <UiIcon name="shuffle" :size="15" />
            重新生成
          </UiButton>
        </div>
      </UiSection>

      <UiSection v-if="list.length" title="生成结果" :description="`共 ${list.length} 条，点击右侧按钮复制`">
        <div class="uuid-list">
          <div v-for="(uuid, index) in list" :key="index" class="uuid-item">
            <code class="uuid-item__code">{{ uuid }}</code>
            <UiButton variant="secondary" size="sm" @click="onCopyOne(uuid)">
              <UiIcon name="copy" :size="14" />
              复制
            </UiButton>
          </div>
        </div>
        <div class="uuid-actions">
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
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
