<script setup>
// IP 工具页：CIDR 子网计算 / IP 归属地查询 / 我的公网 IP
// 子网计算：纯位运算，算法在 common/utils/ip-subnet.js
// 归属地查询：离线 xdb 库，算法在 common/utils/ip-region.js，取数在 ./scripts/ip-db.js
// 我的 IP：只请求本站同源 /api/ip，不经第三方，见 ./scripts/my-ip.js
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { formatBytes, formatNumber } from '@/common/utils/format'
import { describeCidr, parseCidr, sameSubnet } from '@/common/utils/ip-subnet'
import { describeRegion } from '@/common/utils/ip-region'
import { DB_SIZE_HINT, hasCachedDb, loadRegionSearcher } from './scripts/ip-db'
import { fetchMyIp } from './scripts/my-ip'

const messageOf = (err) => (err instanceof Error ? err.message : String(err))

const TABS = [
  { label: '子网计算', value: 'subnet' },
  { label: 'IP 归属地', value: 'region' },
  { label: '我的 IP', value: 'mine' },
]
const activeTab = ref('subnet')

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

// ---------- IP 归属地（离线库） ----------
const regionInput = ref('')
const searcher = shallowRef(null)
const dbPhase = ref('idle')
const dbStage = ref('')
const dbLoaded = ref(0)
const dbTotal = ref(0)
const dbError = ref('')
const dbCached = ref(false)

const dbProgress = computed(() => (dbTotal.value ? dbLoaded.value / dbTotal.value : 0))

const STAGE_TEXT = {
  checking: '正在检查本地缓存',
  downloading: '正在下载离线库',
  parsing: '正在解析索引',
  caching: '正在写入本地缓存',
}
const dbStatusText = computed(() => STAGE_TEXT[dbStage.value] || '准备中')

async function ensureDb() {
  if (searcher.value || dbPhase.value === 'loading') return
  dbPhase.value = 'loading'
  dbError.value = ''
  try {
    searcher.value = await loadRegionSearcher((status) => {
      dbStage.value = status.phase
      if (status.phase === 'downloading') {
        dbLoaded.value = status.loaded || 0
        dbTotal.value = status.total || 0
      }
    })
    dbPhase.value = 'ready'
    dbCached.value = true
  } catch (err) {
    dbPhase.value = 'error'
    dbError.value = messageOf(err)
  }
}

/** 切进归属地页签才取数据：不想下 11MB 的用户不会被动消耗流量 */
watch(activeTab, (tab) => {
  if (tab === 'region') ensureDb()
})

onMounted(async () => {
  dbCached.value = await hasCachedDb()
})

const regionResult = computed(() => {
  const text = regionInput.value.trim()
  if (!text || !searcher.value) return null
  try {
    return { ok: true, entry: searcher.value.search(text) }
  } catch (err) {
    return { ok: false, error: messageOf(err) }
  }
})

const REGION_ROWS = computed(() => {
  const r = regionResult.value
  if (!r?.ok || !r.entry.found) return []
  const e = r.entry
  return [
    { label: '归属地', value: describeRegion(e), copy: true },
    { label: '国家 / 地区', value: e.country || '—', copy: false },
    { label: '省份', value: e.province || '—', copy: false },
    { label: '城市', value: e.city || '—', copy: false },
    { label: '运营商', value: e.isp || '—', copy: false },
    { label: '国家代码', value: e.isoCode || '—', copy: false },
    { label: '所属网段', value: `${e.segment.start} ~ ${e.segment.end}`, copy: true },
  ]
})

// ---------- 我的公网 IP ----------
const myIp = ref('')
const myIpPhase = ref('idle')
const myIpError = ref('')

async function queryMyIp() {
  myIpPhase.value = 'loading'
  myIpError.value = ''
  try {
    myIp.value = await fetchMyIp()
    myIpPhase.value = 'ready'
  } catch (err) {
    myIp.value = ''
    myIpPhase.value = 'error'
    myIpError.value = messageOf(err)
  }
}

const myIpIsV6 = computed(() => myIp.value.includes(':'))

/** 离线库已加载时顺手带出归属地，没加载就不为这一点需求去下 11MB */
const myIpRegion = computed(() => {
  if (!myIp.value || myIpIsV6.value || !searcher.value) return null
  try {
    const entry = searcher.value.search(myIp.value)
    return entry.found ? entry : null
  } catch {
    return null
  }
})
</script>

<template>
  <ToolShell
    title="IP 工具"
    description="CIDR 子网计算、IP 归属地查询与公网 IP 探测。归属地走本地离线库，查询不出浏览器；公网 IP 仅由本站同源端点回报。"
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
          <UiInput v-model="regionInput" placeholder="例如 114.114.114.114" />

          <div v-if="dbPhase === 'loading'" class="ip-db">
            <div class="ip-db__track">
              <span class="ip-db__bar" :style="{ width: `${dbProgress * 100}%` }" />
            </div>
            <p class="ip-db__text">
              {{ dbStatusText }}
              <template v-if="dbStage === 'downloading' && dbTotal">
                · {{ formatBytes(dbLoaded) }} / {{ formatBytes(dbTotal) }}
              </template>
            </p>
            <p v-if="dbStage === 'downloading'" class="ip-hint">
              离线库 {{ DB_SIZE_HINT }}，仅首次需要下载，之后走本地缓存、断网也能查。
            </p>
          </div>

          <template v-else-if="dbPhase === 'error'">
            <p class="ip-error">
              <UiIcon name="alert-circle" :size="14" />
              {{ dbError }}
            </p>
            <UiButton variant="secondary" size="sm" @click="ensureDb">重试</UiButton>
          </template>

          <p v-else-if="dbPhase === 'ready'" class="ip-hint">
            离线库已就绪，共
            {{ formatNumber(searcher.segmentCount) }} 个网段；查询全程在本机完成，不发任何请求。
          </p>
          <p v-else class="ip-hint">
            首次使用需下载离线库（{{ DB_SIZE_HINT }}），下载后持久缓存、断网也能查。
          </p>
        </UiSection>
      </UiCard>

      <UiCard v-if="regionResult && !regionResult.ok">
        <UiSection title="查询失败">
          <p class="ip-error">
            <UiIcon name="alert-circle" :size="14" />
            {{ regionResult.error }}
          </p>
        </UiSection>
      </UiCard>

      <UiCard v-else-if="regionResult?.ok && regionResult.entry.found">
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
          <p v-if="regionResult.entry.isReserved" class="ip-hint">
            该地址属于保留段，不对应具体地理位置。
          </p>
        </UiSection>
      </UiCard>

      <UiCard class="ip-tip">
        <UiIcon name="info" :size="16" />
        <p>
          数据来自 ip2region 离线库（Apache-2.0 /
          MIT），国内精确到城市，境外多数只到国家。库随版本更新， 数据有滞后属正常。
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
            由本站同源端点 /api/ip 回报，不经过任何第三方服务，你的 IP 不会落到别人手里。
          </p>
        </UiSection>
      </UiCard>

      <UiCard v-if="myIp">
        <UiSection title="归属地">
          <p v-if="myIpIsV6" class="ip-hint">
            当前是 IPv6 地址，离线库只收录 IPv4，可复制后另行查询。
          </p>
          <ul v-else-if="myIpRegion" class="ip-list">
            <li class="ip-row">
              <span class="ip-row__label">归属地</span>
              <span class="ip-row__value">{{ describeRegion(myIpRegion) }}</span>
            </li>
            <li class="ip-row">
              <span class="ip-row__label">所属网段</span>
              <span class="ip-row__value">
                {{ myIpRegion.segment.start }} ~ {{ myIpRegion.segment.end }}
              </span>
            </li>
          </ul>
          <template v-else>
            <p class="ip-hint">归属地是本地离线查询，需要先取下离线库。</p>
            <UiButton
              variant="secondary"
              size="sm"
              :disabled="dbPhase === 'loading'"
              @click="ensureDb"
            >
              加载离线库（{{ DB_SIZE_HINT }}）
            </UiButton>
          </template>
        </UiSection>
      </UiCard>

      <UiCard class="ip-tip">
        <UiIcon name="info" :size="16" />
        <p>
          出口 IP 由服务端从连接或反代头（X-Real-IP /
          X-Forwarded-For）读取，仅用于这一次响应，不写日志。
        </p>
      </UiCard>
    </template>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
