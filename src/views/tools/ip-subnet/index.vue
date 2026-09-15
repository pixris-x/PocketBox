<script setup>
// IP 工具页：CIDR 子网计算 / IP 归属地查询 / 我的公网 IP
// 子网计算：纯位运算，在浏览器本地完成，算法见 common/utils/ip-subnet.js
// 归属地与公网 IP：调用本站服务端 API（backend/PocketBox.Api），调用封装见 ./scripts/ip-api.js
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { describeCidr, parseCidr, sameSubnet } from '@/common/utils/ip-subnet'
import { fetchMyIp, lookupRegion } from './scripts/ip-api'

const messageOf = (err) => (err instanceof Error ? err.message : String(err))

const TABS = [
  { label: '子网计算', value: 'subnet' },
  { label: 'IP 归属地', value: 'region' },
  { label: '我的 IP', value: 'mine' },
]
const activeTab = ref('subnet')

/** 归属地单行描述；保留地址给专门文案 */
function describeRegion(entry) {
  if (!entry?.found) return '未收录'
  if (entry.isReserved) return '保留地址（未分配为公网）'
  return [entry.country, entry.province, entry.city, entry.isp].filter(Boolean).join(' ')
}

// ---------- 子网计算 ----------
const input = ref('192.168.1.0/24')
const secondCidr = ref('192.168.1.200/24')

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

// ---------- IP 归属地 ----------
const regionInput = ref('')
const regionEntry = ref(null)
const regionPhase = ref('idle')
const regionError = ref('')

async function queryRegion() {
  const text = regionInput.value.trim()
  if (!text || regionPhase.value === 'loading') return

  regionPhase.value = 'loading'
  regionError.value = ''
  regionEntry.value = null
  try {
    regionEntry.value = await lookupRegion(text)
    regionPhase.value = 'ready'
  } catch (err) {
    regionPhase.value = 'error'
    regionError.value = messageOf(err)
  }
}

const REGION_ROWS = computed(() => {
  const e = regionEntry.value
  if (!e?.found) return []
  return [
    { label: '归属地', value: describeRegion(e), copy: true },
    { label: '国家 / 地区', value: e.country || '—', copy: false },
    { label: '省份', value: e.province || '—', copy: false },
    { label: '城市', value: e.city || '—', copy: false },
    { label: '运营商', value: e.isp || '—', copy: false },
    { label: '国家代码', value: e.isoCode || '—', copy: false },
  ]
})

// ---------- 我的公网 IP ----------
const myIp = ref('')
const myIpPhase = ref('idle')
const myIpError = ref('')
const myRegion = ref(null)
const myRegionPhase = ref('idle')
const myRegionError = ref('')

async function queryMyIp() {
  myIpPhase.value = 'loading'
  myIpError.value = ''
  myRegion.value = null
  myRegionPhase.value = 'idle'
  try {
    myIp.value = await fetchMyIp()
    myIpPhase.value = 'ready'
    // 归属地是附加信息，单独加载，不拖慢 IP 本身的展示
    queryMyRegion()
  } catch (err) {
    myIp.value = ''
    myIpPhase.value = 'error'
    myIpError.value = messageOf(err)
  }
}

async function queryMyRegion() {
  if (!myIp.value) return
  if (myIpIsV6.value) {
    // 离线库只收录 IPv4，不必白跑一次请求换回一个必然的 400
    myRegionPhase.value = 'unsupported'
    return
  }

  myRegionPhase.value = 'loading'
  myRegionError.value = ''
  try {
    myRegion.value = await lookupRegion(myIp.value)
    myRegionPhase.value = 'ready'
  } catch (err) {
    myRegionPhase.value = 'error'
    myRegionError.value = messageOf(err)
  }
}

const myIpIsV6 = computed(() => myIp.value.includes(':'))

const REGION_ROWS_FOR_MY_IP = computed(() => {
  const e = myRegion.value
  if (!e?.found) return []
  return [
    { label: '归属地', value: describeRegion(e), copy: true },
    { label: '运营商', value: e.isp || '—', copy: false },
  ]
})
</script>

<template>
  <ToolShell
    title="IP 工具"
    description="CIDR 子网计算、IP 归属地查询与公网 IP 探测。子网计算在浏览器本地完成；归属地与公网 IP 由本站服务端提供，不经任何第三方。"
  >
    <div class="ip-tabs">
      <UiTabs v-model="activeTab" :tabs="TABS" />
    </div>

    <!-- 子网计算 -->
    <template v-if="activeTab === 'subnet'">
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
          <p
            v-if="comparison?.ok"
            class="ip-compare__result"
            :class="{ 'is-same': comparison.same }"
          >
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
    </template>

    <!-- IP 归属地 -->
    <template v-else-if="activeTab === 'region'">
      <UiCard>
        <UiSection title="查询 IP 归属地">
          <UiInput
            v-model="regionInput"
            placeholder="例如 114.114.114.114"
            @keyup.enter="queryRegion"
          />
          <div class="ip-actions">
            <UiButton
              :disabled="regionPhase === 'loading' || !regionInput.trim()"
              @click="queryRegion"
            >
              <UiIcon name="search" :size="15" />
              {{ regionPhase === 'loading' ? '查询中…' : '查询归属地' }}
            </UiButton>
          </div>
          <p class="ip-hint">输入 IP 后回车或点查询。IPv4 精确到城市，境外多数只到国家。</p>
        </UiSection>
      </UiCard>

      <UiCard v-if="regionPhase === 'error'">
        <UiSection title="查询失败">
          <p class="ip-error">
            <UiIcon name="alert-circle" :size="14" />
            {{ regionError }}
          </p>
        </UiSection>
      </UiCard>

      <UiCard v-else-if="regionEntry?.found">
        <UiSection title="归属地信息">
          <ul class="ip-list">
            <li v-for="row in REGION_ROWS" :key="row.label" class="ip-row">
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
          <p v-if="regionEntry.isReserved" class="ip-hint">
            该地址属于保留段，不对应具体地理位置。
          </p>
        </UiSection>
      </UiCard>

      <UiCard v-else-if="regionEntry">
        <UiSection title="未收录">
          <p class="ip-hint">归属地库中没有 {{ regionEntry.ip }} 的记录。</p>
        </UiSection>
      </UiCard>

      <UiCard class="ip-tip">
        <UiIcon name="info" :size="16" />
        <p>
          数据来自 ip2region 离线库（Apache-2.0 /
          MIT），内置于本站服务端。库随版本更新，数据有滞后属正常。
        </p>
      </UiCard>
    </template>

    <!-- 我的公网 IP -->
    <template v-else>
      <UiCard>
        <UiSection title="我的公网 IP">
          <UiButton :disabled="myIpPhase === 'loading'" @click="queryMyIp">
            <UiIcon name="refresh" :size="15" />
            {{ myIpPhase === 'loading' ? '查询中…' : '查询我的公网 IP' }}
          </UiButton>

          <p v-if="myIpPhase === 'error'" class="ip-error">
            <UiIcon name="alert-circle" :size="14" />
            {{ myIpError }}
          </p>

          <div v-else-if="myIp" class="ip-mine">
            <span class="ip-mine__ip">{{ myIp }}</span>
            <UiButton
              variant="secondary"
              size="sm"
              @click="copyText(myIp, { successMsg: '已复制' })"
            >
              <UiIcon name="copy" :size="14" />
              复制
            </UiButton>
          </div>

          <p v-else class="ip-hint">
            由本站服务端读取连接来源后回报，不经过任何第三方，你的 IP 不会落到别人手里。
          </p>
        </UiSection>
      </UiCard>

      <UiCard v-if="myIp">
        <UiSection title="归属地">
          <p v-if="myRegionPhase === 'unsupported'" class="ip-hint">
            当前是 IPv6 地址，归属地库只收录 IPv4，可复制后另行查询。
          </p>
          <p v-else-if="myRegionPhase === 'error'" class="ip-error">
            <UiIcon name="alert-circle" :size="14" />
            {{ myRegionError }}
          </p>
          <p v-else-if="myRegionPhase === 'loading'" class="ip-hint">正在查询归属地…</p>
          <ul v-else-if="myRegion?.found" class="ip-list">
            <li v-for="row in REGION_ROWS_FOR_MY_IP" :key="row.label" class="ip-row">
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
          <p v-else class="ip-hint">归属地库中没有该地址的记录。</p>
        </UiSection>
      </UiCard>

      <UiCard class="ip-tip">
        <UiIcon name="info" :size="16" />
        <p>
          出口 IP 由服务端从连接或反向代理头（X-Real-IP /
          X-Forwarded-For）读取，仅用于这一次响应，不写日志。
        </p>
      </UiCard>
    </template>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
