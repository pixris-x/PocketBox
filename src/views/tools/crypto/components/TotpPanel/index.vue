<script setup>
// TOTP / 2FA 动态码：本地用 Web Crypto 计算，密钥不出浏览器
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { copyText } from '@/common/utils/copy'
import { generateTotp, parseOtpauthUri } from '@/common/utils/totp'

const SAMPLE_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
const SAMPLE_URI = `otpauth://totp/PocketBox:demo?secret=${SAMPLE_SECRET}&issuer=PocketBox`

const input = ref(SAMPLE_SECRET)
const code = ref('')
const remaining = ref(0)
const period = ref(30)
const error = ref('')
const issuer = ref('')

// 支持直接粘贴 otpauth:// 链接（身份验证器导出的形式）
const parsedUri = computed(() => parseOtpauthUri(input.value.trim()))

const progress = computed(() =>
  period.value > 0 ? Math.max(0, Math.min(1, remaining.value / period.value)) : 0
)

async function refresh() {
  const text = input.value.trim()
  if (!text) {
    code.value = ''
    error.value = ''
    issuer.value = ''
    return
  }

  const uri = parseOtpauthUri(text)
  const secret = uri ? uri.secret : text
  issuer.value = uri?.issuer || (uri?.label ? uri.label : '')

  try {
    const result = await generateTotp(secret, {
      digits: uri?.digits ?? 6,
      period: uri?.period ?? 30,
      algorithm: uri?.algorithm ?? 'SHA1',
    })
    code.value = result.code
    remaining.value = result.remaining
    period.value = result.period
    error.value = ''
  } catch (err) {
    code.value = ''
    error.value = err.message || '无法计算验证码'
  }
}

const displayCode = computed(() => {
  if (!code.value) return ''
  // 六位以上插入一个空格，便于核对
  return code.value.length > 6
    ? `${code.value.slice(0, code.value.length - 3)} ${code.value.slice(-3)}`
    : `${code.value.slice(0, 3)} ${code.value.slice(3)}`
})

let timer = null
watch(input, refresh)
onMounted(() => {
  refresh()
  timer = setInterval(refresh, 1000)
})
onUnmounted(() => clearInterval(timer))

function fillSample() {
  input.value = SAMPLE_URI
}
</script>

<template>
  <UiCard>
    <UiSection
      title="密钥"
      description="支持 Base32 密钥，或直接粘贴身份验证器导出的 otpauth:// 链接"
    >
      <UiTextarea
        v-model="input"
        :rows="2"
        mono
        placeholder="例如 JBSWY3DPEHPK3PXP 或 otpauth://totp/…"
      />
      <div class="totp__row">
        <div class="totp__meta">
          <UiTag v-if="issuer" variant="neutral">{{ issuer }}</UiTag>
          <UiTag v-if="parsedUri" variant="primary">
            {{ parsedUri.digits }} 位 · 周期 {{ parsedUri.period }}s · {{ parsedUri.algorithm }}
          </UiTag>
        </div>
        <div class="totp__actions">
          <UiButton variant="ghost" size="sm" @click="fillSample">
            <UiIcon name="sparkles" :size="14" />
            填入示例链接
          </UiButton>
          <UiButton variant="ghost" size="sm" :disabled="!input" @click="input = ''">
            <UiIcon name="close" :size="14" />
            清空
          </UiButton>
        </div>
      </div>
      <p v-if="error" class="totp__error">{{ error }}</p>
    </UiSection>
  </UiCard>

  <UiCard v-if="code">
    <UiSection title="当前验证码">
      <div class="totp__code-row">
        <code class="totp__code">{{ displayCode }}</code>
        <UiButton size="sm" @click="copyText(code, { successMsg: '验证码已复制' })">
          <UiIcon name="copy" :size="14" />
          复制
        </UiButton>
      </div>
      <div class="totp__progress">
        <div class="totp__progress-bar">
          <div class="totp__progress-fill" :style="{ width: `${progress * 100}%` }" />
        </div>
        <span class="totp__remaining">{{ remaining }}s 后刷新</span>
      </div>
      <p class="totp__hint">
        验证码随窗口自动更新；系统时间不准确会导致验证失败，请确认设备时间已同步。
      </p>
    </UiSection>
  </UiCard>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
