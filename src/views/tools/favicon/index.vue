<script setup>
// Favicon 生成：一张图导出全尺寸 PNG 与打包 favicon.ico，纯本地
import { ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { downloadBlob } from '@/common/utils/download'
import { copyText } from '@/common/utils/copy'
import { useToast } from '@/common/utils/toast'
import { faviconHtmlSnippet, generateFavicons, packIco } from './scripts/favicon'

const toast = useToast()

const ALL_SIZES = [16, 32, 48, 64, 96, 128, 180, 192, 256, 512]
const ICO_SIZES = '16 / 32 / 48'

const file = ref(null)
const previewUrl = ref('')
const selected = ref([16, 32, 48, 180, 192, 512])
const generating = ref(false)
const results = ref([]) // {size, blob, url}

const htmlSnippet = faviconHtmlSnippet()

function toggleSize(size) {
  const index = selected.value.indexOf(size)
  if (index === -1) selected.value.push(size)
  else selected.value.splice(index, 1)
}

async function onFile(files) {
  const image = files.find((f) => f.type.startsWith('image/'))
  if (!image) {
    toast.error('请选择图片文件')
    return
  }
  file.value = image
  results.value = []
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(image)
}

async function onGenerate() {
  if (!file.value || generating.value) return
  if (selected.value.length === 0) {
    toast.error('请至少选择一个尺寸')
    return
  }
  generating.value = true
  try {
    const sizes = [...selected.value].sort((a, b) => a - b)
    results.value.forEach((item) => URL.revokeObjectURL(item.url))
    const generated = await generateFavicons(file.value, sizes)
    results.value = generated.map((item) => ({
      ...item,
      url: URL.createObjectURL(item.blob),
    }))
    toast.success(`已生成 ${sizes.length} 个尺寸`)
  } catch {
    toast.error('生成失败，请重试')
  } finally {
    generating.value = false
  }
}

async function onDownloadIco() {
  if (!results.value.length) return
  try {
    const blob = await packIco(results.value)
    downloadBlob(blob, 'favicon.ico')
    toast.success('favicon.ico 已下载')
  } catch (err) {
    toast.error(err.message || '打包失败：需要包含 16 / 32 / 48px')
  }
}

function onCopyHtml() {
  copyText(htmlSnippet, { successMsg: 'HTML 引用代码已复制' })
}
</script>

<template>
  <ToolShell
    title="Favicon 生成"
    description="一张图生成全尺寸 favicon：cover 式居中裁剪为正方形，逐尺寸导出 PNG，并可打包标准 favicon.ico（16/32/48 三合一）。图片不上传，全部本地处理。"
  >
    <UiCard>
      <UiSection title="选择图片">
        <UiDropzone
          accept="image/*"
          title="点击选择图片，或拖拽到此处"
          hint="建议使用 512×512 以上的方形 logo，任何尺寸都会自动居中裁剪"
          @files="onFile"
        />

        <div v-if="file" class="favicon__file">
          <img v-if="previewUrl" class="favicon__thumb" :src="previewUrl" alt="原图预览" />
          <div class="favicon__file-meta">
            <p class="favicon__file-name">{{ file.name }}</p>
          </div>
        </div>

        <div class="favicon__sizes">
          <UiCheckbox
            v-for="size in ALL_SIZES"
            :key="size"
            :model-value="selected.includes(size)"
            @update:model-value="toggleSize(size)"
          >
            {{ size }}px
          </UiCheckbox>
        </div>

        <div class="favicon__row">
          <p class="favicon__hint">ICO 打包固定包含 {{ ICO_SIZES }} 三个尺寸</p>
          <UiButton size="sm" :loading="generating" :disabled="!file" @click="onGenerate">
            <UiIcon name="sparkles" :size="14" />
            生成
          </UiButton>
        </div>
      </UiSection>
    </UiCard>

    <UiCard v-if="results.length">
      <UiSection title="下载">
        <div class="favicon__grid">
          <div v-for="item in results" :key="item.size" class="favicon__item">
            <img class="favicon__preview" :src="item.url" :alt="`${item.size}px`" />
            <UiButton
              variant="ghost"
              size="sm"
              @click="downloadBlob(item.blob, `favicon-${item.size}.png`)"
            >
              <UiIcon name="download" :size="14" />
              {{ item.size }}px
            </UiButton>
          </div>
        </div>

        <div class="favicon__row">
          <UiButton size="sm" @click="onDownloadIco">
            <UiIcon name="download" :size="14" />
            下载 favicon.ico（{{ ICO_SIZES }}）
          </UiButton>
          <UiButton variant="ghost" size="sm" @click="onCopyHtml">
            <UiIcon name="copy" :size="14" />
            复制 HTML 引用代码
          </UiButton>
        </div>
        <pre class="favicon__html">{{ htmlSnippet }}</pre>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
