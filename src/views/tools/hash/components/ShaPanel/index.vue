<script setup>
// SHA 哈希页（文本 / 文件，支持 SHA-1 / 256 / 384 / 512）
import { computed, ref, watch } from 'vue'
import { copyText } from '@/common/utils/copy'
import { formatBytes } from '@/common/utils/format'
import { SHA_ALGORITHMS, isWebCryptoAvailable, shaFile, shaText } from '@/common/utils/sha'

const ALGORITHM_OPTIONS = SHA_ALGORITHMS.map((item) => ({ label: item.label, value: item.id }))

// 依赖 Web Crypto，纯 HTTP 的局域网地址下不可用，此处提前判定以便整页给出说明
const webCryptoReady = isWebCryptoAvailable()

const modes = [
  { label: '文本', value: 'text' },
  { label: '文件', value: 'file' },
]

const mode = ref('text')
const algorithm = ref('SHA-256')

const algorithmNote = computed(
  () => SHA_ALGORITHMS.find((item) => item.id === algorithm.value)?.note || ''
)

const messageOf = (err) => (err instanceof Error ? err.message : String(err))

// ---- 文本模式 ----
const textInput = ref('')
const textResult = ref('')
const textError = ref('')
const hasComputedText = ref(false)

async function computeText() {
  hasComputedText.value = true
  textError.value = ''
  try {
    textResult.value = await shaText(textInput.value, algorithm.value)
  } catch (err) {
    textResult.value = ''
    textError.value = messageOf(err)
  }
}

// ---- 文件模式 ----
const pickedFile = ref(null)
const fileName = ref('')
const fileSize = ref(0)
const fileResult = ref('')
const fileError = ref('')
const computing = ref(false)

async function computeFile() {
  if (!pickedFile.value) return
  fileError.value = ''
  fileResult.value = ''
  computing.value = true
  try {
    fileResult.value = await shaFile(pickedFile.value, algorithm.value)
  } catch (err) {
    fileError.value = '计算失败：' + messageOf(err)
  } finally {
    computing.value = false
  }
}

async function onFilePicked(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  pickedFile.value = file
  fileName.value = file.name
  fileSize.value = file.size
  await computeFile()
}

// 换算法后旧摘要即失效：文本重算（便宜），文件用留存的 File 对象重算
watch(algorithm, () => {
  if (hasComputedText.value) computeText()
  computeFile()
})
</script>

<template>
  <UiCard v-if="!webCryptoReady">
    <UiSection title="当前环境无法计算 SHA">
      <p class="sha-blocked">
        <UiIcon name="alert-triangle" :size="14" />
        SHA 依赖浏览器的
        <strong>Web Crypto</strong> 接口，它只在<strong>安全上下文</strong>下可用， 也就是
        <code>https://</code> 或 <code>localhost</code>。当前页面不满足该条件，因此无法计算。
      </p>
      <p class="sha-hint">
        改用 HTTPS 地址访问即可；若暂时无法，站内的 MD5 工具不依赖该接口，但安全性较低。
      </p>
    </UiSection>
  </UiCard>

  <template v-else>
    <UiTabs v-model="mode" :tabs="modes" />

    <UiCard>
      <UiSection title="算法">
        <UiSelect v-model="algorithm" :options="ALGORITHM_OPTIONS" />
        <p class="sha-note">{{ algorithmNote }}</p>
      </UiSection>
    </UiCard>

    <UiCard v-if="mode === 'text'">
      <UiSection title="输入文本">
        <UiTextarea v-model="textInput" placeholder="输入要计算摘要的文本…" :rows="6" />
        <div class="sha-actions">
          <UiButton @click="computeText">
            <UiIcon name="hash" :size="15" />
            计算 {{ algorithm }}
          </UiButton>
        </div>
      </UiSection>

      <UiSection v-if="textError" title="计算失败">
        <p class="sha-error">
          <UiIcon name="alert-circle" :size="14" />
          {{ textError }}
        </p>
      </UiSection>

      <UiSection v-else-if="textResult" :title="`${algorithm} 摘要`">
        <div class="sha-result">
          <code class="sha-result__code">{{ textResult }}</code>
          <UiButton
            variant="secondary"
            size="sm"
            @click="copyText(textResult, { successMsg: '摘要已复制' })"
          >
            <UiIcon name="copy" :size="14" />
            复制
          </UiButton>
        </div>
      </UiSection>
    </UiCard>

    <UiCard v-else>
      <UiSection title="选择文件">
        <input type="file" @change="onFilePicked" />
        <p class="sha-hint">文件在本地读取计算，不会上传到服务器。</p>
      </UiSection>

      <UiSection v-if="fileName" title="计算结果">
        <p class="sha-file">{{ fileName }} · {{ formatBytes(fileSize) }}</p>

        <div v-if="computing" class="sha-loading">
          <span class="sha-spinner" aria-hidden="true" />
          计算中…
        </div>
        <p v-else-if="fileError" class="sha-error">
          <UiIcon name="alert-circle" :size="14" />
          {{ fileError }}
        </p>
        <div v-else-if="fileResult" class="sha-result">
          <code class="sha-result__code">{{ fileResult }}</code>
          <UiButton
            variant="secondary"
            size="sm"
            @click="copyText(fileResult, { successMsg: '摘要已复制' })"
          >
            <UiIcon name="copy" :size="14" />
            复制
          </UiButton>
        </div>
      </UiSection>
    </UiCard>

    <UiCard class="sha-tip">
      <UiIcon name="info" :size="16" />
      <p>
        日常校验用 SHA-256 即可；SHA-1 已被证明可构造碰撞，仅建议用于兼容老系统。
        涉及密码存储时，应使用 bcrypt / argon2 这类带盐且刻意变慢的算法，而不是任何单纯的高速摘要。
      </p>
    </UiCard>
  </template>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
