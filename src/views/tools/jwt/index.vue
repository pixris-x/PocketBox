<script setup>
// JWT 解析页：本地解码 header / payload，高亮标准声明与有效期状态
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { ALGORITHM_NOTES, JWT_CLAIMS, decodeJwt, tokenTimeStatus } from '@/common/utils/jwt'
import { dateToLocalString, tsToDate } from '@/common/utils/timestamp'
import { copyText } from '@/common/utils/copy'

const HEADER_SEGMENT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
const PAYLOAD_SEGMENT =
  'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW8oOS4iSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjo0MTAyNDQ0ODAwfQ'
const SIGNATURE_SEGMENT = 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
const SAMPLE = `${HEADER_SEGMENT}.${PAYLOAD_SEGMENT}.${SIGNATURE_SEGMENT}`

const STATES = {
  expired: { label: '已过期', variant: 'danger' },
  'not-yet': { label: '尚未生效', variant: 'warning' },
  valid: { label: '在有效期内', variant: 'success' },
  unknown: { label: '无时间声明', variant: 'neutral' },
}

const source = ref('')

const decoded = computed(() => {
  if (!source.value.trim()) return { header: null, payload: null, signature: '', error: '' }
  try {
    return { ...decodeJwt(source.value), error: '' }
  } catch (err) {
    return {
      header: null,
      payload: null,
      signature: '',
      error: err instanceof Error ? err.message : String(err),
    }
  }
})

const status = computed(() => {
  if (!decoded.value.payload) return null
  return STATES[tokenTimeStatus(decoded.value.payload)]
})

const algorithmNote = computed(() => {
  const alg = decoded.value.header?.alg
  if (!alg) return ''
  return ALGORITHM_NOTES[alg] ?? '未收录的算法'
})

// 只列出实际存在的标准声明，未出现的字段不铺空行
const claims = computed(() => {
  const payload = decoded.value.payload
  if (!payload) return []
  return JWT_CLAIMS.filter((claim) => claim.key in payload).map((claim) => {
    const raw = payload[claim.key]
    return {
      key: claim.key,
      label: claim.label,
      value: Array.isArray(raw) ? raw.join(', ') : String(raw),
      readable: claim.time && typeof raw === 'number' ? dateToLocalString(tsToDate(raw)) : '',
    }
  })
})

const headerJson = computed(() =>
  decoded.value.header ? JSON.stringify(decoded.value.header, null, 2) : ''
)
const payloadJson = computed(() =>
  decoded.value.payload ? JSON.stringify(decoded.value.payload, null, 2) : ''
)
</script>

<template>
  <ToolShell
    title="JWT 解析"
    description="在本机解开 JWT 的 Header 与 Payload，标出标准声明与有效期状态。令牌不会发送到任何服务器。"
  >
    <UiCard>
      <UiSection title="令牌">
        <UiTextarea v-model="source" :rows="4" mono placeholder="粘贴 JWT，可带 Bearer 前缀…" />
        <div class="jwt__row">
          <div class="jwt__actions">
            <UiButton variant="ghost" size="sm" @click="source = SAMPLE">
              <UiIcon name="sparkles" :size="14" />
              填入示例
            </UiButton>
            <UiButton variant="ghost" size="sm" :disabled="!source" @click="source = ''">
              <UiIcon name="close" :size="14" />
              清空
            </UiButton>
          </div>
        </div>

        <p class="jwt__notice">
          <UiIcon name="shield" :size="14" />
          仅做 Base64URL 解码，<strong>不校验签名</strong>。能解出内容并不代表令牌真实有效，
          请勿据此判断令牌可信度。
        </p>

        <p v-if="decoded.error" class="jwt__error">
          <UiIcon name="alert-circle" :size="14" />
          {{ decoded.error }}
        </p>
      </UiSection>

      <template v-if="decoded.payload">
        <UiSection title="解码概览">
          <div class="jwt__tags">
            <UiTag v-if="decoded.header?.alg" variant="primary">
              算法 {{ decoded.header.alg }}
            </UiTag>
            <UiTag v-if="decoded.header?.typ" variant="neutral">
              类型 {{ decoded.header.typ }}
            </UiTag>
            <UiTag v-if="status" :variant="status.variant">{{ status.label }}</UiTag>
          </div>
          <p v-if="algorithmNote" class="jwt__note">{{ algorithmNote }}</p>

          <ul v-if="claims.length" class="jwt__list">
            <li v-for="claim in claims" :key="claim.key" class="jwt__item">
              <span class="jwt__item-label">{{ claim.label }}</span>
              <span class="jwt__item-value">
                <code>{{ claim.value }}</code>
                <span v-if="claim.readable" class="jwt__item-time">{{ claim.readable }}</span>
              </span>
            </li>
          </ul>
          <p v-else class="jwt__note">Payload 中没有标准声明，请看下方完整内容。</p>
        </UiSection>

        <UiSection title="Header">
          <pre class="jwt__output">{{ headerJson }}</pre>
        </UiSection>

        <UiSection title="Payload（完整）">
          <pre class="jwt__output">{{ payloadJson }}</pre>
          <div class="jwt__row">
            <UiButton
              class="jwt__submit"
              size="sm"
              @click="copyText(payloadJson, { successMsg: 'Payload 已复制' })"
            >
              <UiIcon name="copy" :size="14" />
              复制 Payload
            </UiButton>
          </div>
        </UiSection>

        <UiSection title="签名">
          <pre v-if="decoded.signature" class="jwt__output">{{ decoded.signature }}</pre>
          <p v-else class="jwt__note">该令牌没有第三段，属于未签名令牌。</p>
          <p class="jwt__note">
            签名需要原始密钥或公钥才能验证，本工具不做校验。若需确认令牌真伪，请在服务端验证。
          </p>
        </UiSection>
      </template>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
