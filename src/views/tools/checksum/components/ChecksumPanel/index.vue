<script setup>
// 校验和面板：CRC-32 / Adler-32，输入可以是文本，也可以是文件
import { computed, ref } from 'vue'
import { copyText } from '@/common/utils/copy'
import { adler32, crc32, toHex } from '@/common/utils/checksum'
import { formatNumber } from '@/common/utils/format'

const mode = ref('text')
const text = ref('')
const file = ref(null)
const fileBytes = ref(null)
const fileName = ref('')
const fileSize = ref(0)
const fileError = ref('')

// 文本模式即时计算；文件模式在选中后算一次
const activeBytes = computed(() => (mode.value === 'file' ? fileBytes.value : null))
const source = computed(() => (mode.value === 'file' ? activeBytes.value : text.value))
const ready = computed(() => (mode.value === 'text' ? true : Boolean(activeBytes.value)))

const crc = computed(() => (ready.value ? crc32(source.value) : 0))
const adler = computed(() => (ready.value ? adler32(source.value) : 0))

const results = computed(() => [
  { label: 'CRC-32（十六进制）', value: toHex(crc.value), hint: '等价于 gzip / PNG 的 CRC 段' },
  { label: 'CRC-32（十进制）', value: formatNumber(crc.value), hint: '' },
  { label: 'Adler-32（十六进制）', value: toHex(adler.value), hint: 'zlib 尾部校验字段' },
  { label: 'Adler-32（十进制）', value: formatNumber(adler.value), hint: '' },
])

async function onFiles(files) {
  const picked = files[0]
  fileError.value = ''
  if (!picked) return
  try {
    fileBytes.value = new Uint8Array(await picked.arrayBuffer())
    file.value = picked
    fileName.value = picked.name
    fileSize.value = picked.size
    mode.value = 'file'
  } catch (err) {
    fileBytes.value = null
    fileError.value = err.message || '读取文件失败'
  }
}

function clearFile() {
  file.value = null
  fileBytes.value = null
  fileName.value = ''
  fileSize.value = 0
  fileError.value = ''
}
</script>

<template>
  <UiTabs
    v-model="mode"
    :tabs="[
      { label: '文本', value: 'text' },
      { label: '文件', value: 'file' },
    ]"
  />

  <UiCard>
    <UiSection v-if="mode === 'text'" title="输入文本">
      <UiTextarea v-model="text" placeholder="输入任意文本，结果实时更新…" :rows="5" mono />
      <p class="cks-hint">按 UTF-8 字节计算，中文与 emoji 与文件字节口径一致</p>
    </UiSection>

    <UiSection v-else title="选择文件">
      <UiDropzone
        accept="*/*"
        title="点击选择文件，或拖拽到此处"
        hint="文件只在本地读取计算，不会上传"
        @files="onFiles"
      />
      <p v-if="fileError" class="cks-error">{{ fileError }}</p>
      <div v-if="file" class="cks-file">
        <span class="cks-file__name">{{ fileName }}（{{ formatNumber(fileSize) }} 字节）</span>
        <UiButton variant="ghost" size="sm" @click="clearFile">
          <UiIcon name="close" :size="14" />
          移除
        </UiButton>
      </div>
    </UiSection>
  </UiCard>

  <UiCard v-if="ready" class="cks-results">
    <UiSection title="结果">
      <div v-for="row in results" :key="row.label" class="cks-row">
        <div class="cks-row__info">
          <span class="cks-row__label">{{ row.label }}</span>
          <span v-if="row.hint" class="cks-row__hint">{{ row.hint }}</span>
        </div>
        <code class="cks-row__value">{{ row.value }}</code>
        <UiButton variant="ghost" size="sm" @click="copyText(row.value)">
          <UiIcon name="copy" :size="14" />
        </UiButton>
      </div>
    </UiSection>
  </UiCard>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
