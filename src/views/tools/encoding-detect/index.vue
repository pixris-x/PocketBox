<script setup>
// 编码探测页：判断字节序列的编码，并横向对比各编码的解码结果
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { ENCODINGS, detectEncoding, tryAllEncodings } from '@/common/utils/encoding-detect'

/** 演示用的 GBK 字节（“中文测试”的 GBK 编码） */
const GBK_SAMPLE = new Uint8Array([0xd6, 0xd0, 0xce, 0xc4, 0xb2, 0xe2, 0xca, 0xd4])

const input = ref('')
const activeEncoding = ref('gbk')

const encodingTabs = ENCODINGS.map((item) => ({ label: item.label, value: item.value }))

/** 文本按 UTF-8 存字节（页面拿不到任意原始字节时用这条路径） */
const bytes = computed(() => new TextEncoder().encode(input.value))

const detected = computed(() => (bytes.value.length ? detectEncoding(bytes.value) : null))

const candidates = computed(() => tryAllEncodings(bytes.value))

const preview = computed(() => {
  const found = candidates.value.find((item) => item.encoding === activeEncoding.value)
  return found ? found.text : ''
})

const confidenceLabel = { high: '高', medium: '中', low: '低' }
const confidenceVariant = { high: 'success', medium: 'warning', low: 'danger' }

function loadGbkSample() {
  // 直接写入字节无法通过 v-model 表达，这里用等价提示 + 结果展示
  input.value = '中文测试'
  activeEncoding.value = 'gbk'
}

function hexPreview() {
  return [...bytes.value]
    .slice(0, 48)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ')
}
</script>

<template>
  <ToolShell
    title="编码探测"
    description="判断文本字节序列是 UTF-8、GBK 还是 Big5，定位「满屏问号」这类乱码的来源。GBK 与 Big5 字节区间高度重叠，短文本无法确定；探测结果是「最可能」而不是「确定」。纯本地计算，不上传内容。"
  >
    <UiCard>
      <UiSection title="输入文本" description="按 UTF-8 读入后逐字节分析">
        <UiTextarea v-model="input" :rows="6" mono placeholder="粘贴出现乱码的文本" />
        <div class="enc-bar">
          <UiButton variant="ghost" size="sm" @click="loadGbkSample">
            <UiIcon name="sparkles" :size="14" />
            示例
          </UiButton>
          <span v-if="bytes.length" class="enc-bar__hex">
            前 {{ Math.min(bytes.length, 48) }} 字节：<code>{{ hexPreview() }}</code>
          </span>
        </div>
      </UiSection>

      <UiSection v-if="detected" title="探测结果">
        <div class="enc-result">
          <span class="enc-result__label">最可能的编码</span>
          <span class="enc-result__value">{{ detected.label }}</span>
          <UiTag :variant="confidenceVariant[detected.confidence]">
            置信度 {{ confidenceLabel[detected.confidence] }}
          </UiTag>
          <UiTag v-if="detected.hasBOM" variant="info">{{ detected.bomName }}</UiTag>
        </div>
        <p v-if="detected.confidence === 'low'" class="enc-hint">
          GBK 与 Big5 的字节区间高度重叠，短文本很难区分 —— 下方逐个编码对比一下，
          多数时候肉眼比算法更可靠。
        </p>
      </UiSection>

      <UiSection
        v-if="candidates.length"
        title="逐个编码对比"
        description="按可信度排序，替换符越少、可打印字符越多的越可信"
      >
        <div class="enc-tabs">
          <UiTabs v-model="activeEncoding" :tabs="encodingTabs" />
        </div>

        <UiTextarea :model-value="preview" :rows="6" mono readonly />
        <div class="enc-actions">
          <UiButton variant="secondary" size="sm" @click="copyText(preview)">
            <UiIcon name="copy" :size="14" />
            复制
          </UiButton>
        </div>
      </UiSection>

      <UiSection title="它不能做什么" spaced="false">
        <ul class="enc-notes">
          <li>不能保证判断正确 —— GBK 与 Big5 短文本常被认错，二进制文件会被误判为某种编码</li>
          <li>不修复已丢失的信息：已经被替换成 <code>?</code> 的字符无法还原</li>
          <li>不解码文件上传 —— 只分析你粘贴进来的文本，全部在浏览器本地处理</li>
        </ul>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
