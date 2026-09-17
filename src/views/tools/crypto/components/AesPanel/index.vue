<script setup>
// AES 加解密页（AES-GCM + PBKDF2 口令派生，全部本地完成）
import { computed, ref } from 'vue'
import { copyText } from '@/common/utils/copy'
import {
  PBKDF2_ITERATIONS,
  decryptText,
  encryptText,
  isWebCryptoAvailable,
} from '@/common/utils/aes'

// 依赖 Web Crypto，纯 HTTP 的局域网地址下不可用，此处提前判定以便整页给出说明
const webCryptoReady = isWebCryptoAvailable()

const modes = [
  { label: '加密', value: 'encrypt' },
  { label: '解密', value: 'decrypt' },
]

const mode = ref('encrypt')
const password = ref('')
const showPassword = ref(false)
const inputType = computed(() => (showPassword.value ? 'text' : 'password'))

const messageOf = (err) => (err instanceof Error ? err.message : String(err))

const input = ref('')
const result = ref('')
const error = ref('')
const working = ref(false)

async function run() {
  if (mode.value === 'encrypt') {
    if (input.value === '') return
  } else if (result.value) {
    // 解密已有结果时先清掉，避免误以为还是旧内容
    result.value = ''
  }
  if (password.value === '') {
    error.value = '请先输入口令'
    return
  }
  error.value = ''
  working.value = true
  try {
    if (mode.value === 'encrypt') {
      result.value = await encryptText(input.value, password.value)
    } else {
      result.value = await decryptText(input.value, password.value)
    }
  } catch (err) {
    result.value = ''
    error.value = messageOf(err)
  } finally {
    working.value = false
  }
}

// 切换模式时清空结果与错误，输入保留（常用来"加密完再解回去"对比）
function setMode(value) {
  mode.value = value
  result.value = ''
  error.value = ''
}
</script>

<template>
  <UiCard v-if="!webCryptoReady">
    <UiSection title="当前环境无法加解密">
      <p class="aes-blocked">
        <UiIcon name="alert-triangle" :size="14" />
        加解密依赖浏览器的
        <strong>Web Crypto</strong> 接口，它只在<strong>安全上下文</strong>下可用， 也就是
        <code>https://</code> 或 <code>localhost</code>。当前页面不满足该条件，因此无法使用。
      </p>
    </UiSection>
  </UiCard>

  <template v-else>
    <UiTabs :model-value="mode" :tabs="modes" @update:model-value="setMode" />

    <UiCard>
      <UiSection title="口令">
        <label class="aes-label">
          <span class="aes-label__text">用于派生加密密钥的口令</span>
          <UiInput
            v-model="password"
            :type="inputType"
            placeholder="输入口令（加密与解密必须相同）"
            clearable
          >
            <template #suffix>
              <button
                class="aes-toggle"
                type="button"
                tabindex="-1"
                :aria-label="showPassword ? '隐藏口令' : '显示口令'"
                @click="showPassword = !showPassword"
              >
                <UiIcon :name="showPassword ? 'eye-off' : 'eye'" :size="14" />
              </button>
            </template>
          </UiInput>
        </label>
        <p class="aes-note">
          口令不存储、不上传，也没有找回途径——<strong>忘记口令等于数据丢失</strong>。
        </p>
      </UiSection>
    </UiCard>

    <UiCard>
      <UiSection :title="mode === 'encrypt' ? '明文' : '密文'">
        <UiTextarea
          v-model="input"
          :placeholder="mode === 'encrypt' ? '输入要加密的文本…' : '粘贴本工具生成的密文…'"
          :rows="6"
        />
        <div class="aes-actions">
          <UiButton :disabled="working || input === ''" @click="run">
            <UiIcon :name="mode === 'encrypt' ? 'lock' : 'key'" :size="15" />
            {{ mode === 'encrypt' ? '加密' : '解密' }}
          </UiButton>
        </div>
      </UiSection>

      <UiSection v-if="error" title="出错了">
        <p class="aes-error">
          <UiIcon name="alert-circle" :size="14" />
          {{ error }}
        </p>
      </UiSection>

      <UiSection v-else-if="result" :title="mode === 'encrypt' ? '密文（Base64）' : '解密结果'">
        <div class="aes-result">
          <code class="aes-result__code">{{ result }}</code>
          <UiButton
            variant="secondary"
            size="sm"
            @click="
              copyText(result, { successMsg: mode === 'encrypt' ? '密文已复制' : '结果已复制' })
            "
          >
            <UiIcon name="copy" :size="14" />
            复制
          </UiButton>
        </div>
        <p v-if="mode === 'encrypt'" class="aes-note">
          密文内已包含随机盐与 IV，同一段明文每次加密的结果都不同——这是正常的。
        </p>
      </UiSection>
    </UiCard>

    <UiCard class="aes-tip">
      <UiIcon name="info" :size="16" />
      <p>
        采用 AES-GCM（带认证，密文被篡改时解密会直接失败）与 PBKDF2-HMAC-SHA256（{{
          PBKDF2_ITERATIONS.toLocaleString()
        }}
        次迭代）派生密钥。加密强度取决于口令强度：短口令可被暴力枚举，长且随机的口令才安全。
      </p>
    </UiCard>
  </template>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
