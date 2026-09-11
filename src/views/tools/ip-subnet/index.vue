<script setup>
// IP / 子网计算器页
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { describeCidr, parseCidr, sameSubnet } from '@/common/utils/ip-subnet'

const input = ref('192.168.1.0/24')
const secondCidr = ref('192.168.1.200/24')

const messageOf = (err) => (err instanceof Error ? err.message : String(err))

const result = computed(() => {
  const text = input.value.trim()
  if (!text) return { ok: true, empty: true }
  try {
    return { ok: true, info: describeCidr(text) }
  } catch (err) {
    return { ok: false, error: messageOf(err) }
  }
})

const comparison = computed(() => {
  if (!result.value.ok || result.value.empty) return null
  if (!secondCidr.value.trim()) return null
  try {
    const a = parseCidr(input.value)
    const b = parseCidr(secondCidr.value)
    return { ok: true, same: sameSubnet(a, b) }
  } catch (err) {
    return { ok: false, error: messageOf(err) }
  }
})

const ROWS = computed(() => {
  if (!result.value.ok || result.value.empty) return []
  const r = result.value.info
  return [
    { label: 'IP 地址', value: r.input, copy: true },
    { label: '前缀长度', value: r.mask, copy: true },
    { label: '子网掩码', value: r.maskDotted, copy: true },
    { label: '网络地址', value: r.network, copy: true },
    { label: '广播地址', value: r.broadcast, copy: true },
    { label: '可用主机范围', value: `${r.firstHost} ~ ${r.lastHost}`, copy: true },
    { label: '可用主机数', value: r.hostCount.toLocaleString(), copy: true },
    { label: 'IP 类别', value: r.ipClass, copy: false },
    { label: '地址类型', value: r.kind, copy: false },
  ]
})
</script>

<template>
  <ToolShell
    title="IP / 子网计算器"
    description="输入 CIDR（192.168.1.0/24），立即给出网络地址、广播地址、可用主机范围与地址类型。支持判断两个 IP 是否同处一子网。"
  >
    <UiCard>
      <UiSection title="CIDR">
        <UiInput v-model="input" placeholder="例如 192.168.1.0/24（不写 /N 默认 /32）" />
        <p class="ip-hint">支持纯 IP（默认 /32）、IPv4 CIDR。IPv6 暂不支持。</p>
      </UiSection>
    </UiCard>

    <UiCard v-if="!result.ok">
      <UiSection title="解析失败">
        <p class="ip-error">
          <UiIcon name="alert-circle" :size="14" />
          {{ result.error }}
        </p>
      </UiSection>
    </UiCard>

    <UiCard v-else-if="!result.empty">
      <UiSection title="子网信息">
        <ul class="ip-list">
          <li v-for="row in ROWS" :key="row.label" class="ip-row">
            <span class="ip-row__label">{{ row.label }}</span>
            <span class="ip-row__value">{{ row.value }}</span>
            <UiButton
              v-if="row.copy"
              variant="secondary"
              size="sm"
              @click="copyText(row.value, { successMsg: '已复制' })"
            >
              <UiIcon name="copy" :size="14" />
              复制
            </UiButton>
          </li>
        </ul>
      </UiSection>
    </UiCard>

    <UiCard v-if="result.ok && !result.empty">
      <UiSection title="是否同子网（对比）">
        <div class="ip-compare">
          <span class="ip-compare__lhs">{{ result.info.input }}</span>
          <span class="ip-compare__op">与</span>
          <UiInput v-model="secondCidr" placeholder="再输入一个 CIDR" />
        </div>
        <p v-if="comparison?.ok" class="ip-compare__result" :class="{ 'is-same': comparison.same }">
          <UiIcon :name="comparison.same ? 'check-circle' : 'alert-circle'" :size="16" />
          <span>{{ comparison.same ? '在同一个子网内' : '不在同一个子网内' }}</span>
        </p>
        <p v-else-if="comparison?.ok === false" class="ip-error">
          <UiIcon name="alert-circle" :size="14" />
          {{ comparison.error }}
        </p>
      </UiSection>
    </UiCard>

    <UiCard class="ip-tip">
      <UiIcon name="info" :size="16" />
      <p>
        /31 按 RFC 3021 视为点对点链路（两个地址都是可用主机）；/32 表示单一主机；/0 覆盖整个 IPv4
        地址空间（0.0.0.0 ~ 255.255.255.255）。
      </p>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
