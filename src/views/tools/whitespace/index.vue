<script setup>
// 空白符清理页：压缩行内连续空白、行首尾修剪、删空行、合并单行，纯本地计算
// 与「文本批处理」互补：本工具针对"空格本身"，后者针对"行集合"
import { computed, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { WS_DEFAULTS, countWhitespace, normalizeWhitespace } from '@/common/utils/whitespace'
import { copyText } from '@/common/utils/copy'

// 示例覆盖：行内连续空格 / 制表符 / 全角空格 / 不换行空格 / 空行 / 首尾空白
const SAMPLE = [
  '  苹果  香蕉',
  '',
  '橙子\t芒果\t\t葡萄',
  '\u3000西瓜\u3000\u3000蜜瓜',
  '  菠萝\u00a0木瓜  ',
  '',
  '  榴莲  ',
].join('\n')

const source = ref(SAMPLE)
const collapseSpaces = ref(WS_DEFAULTS.collapseSpaces)
const trimLines = ref(WS_DEFAULTS.trimLines)
const removeEmptyLines = ref(WS_DEFAULTS.removeEmptyLines)
const collapseNewlines = ref(WS_DEFAULTS.collapseNewlines)
const showCompare = ref(false)

const options = computed(() => ({
  collapseSpaces: collapseSpaces.value,
  trimLines: trimLines.value,
  removeEmptyLines: removeEmptyLines.value,
  collapseNewlines: collapseNewlines.value,
}))

const output = computed(() => normalizeWhitespace(source.value, options.value))
const sourceWhitespace = computed(() => countWhitespace(source.value))
const resultWhitespace = computed(() => countWhitespace(output.value))
const removedWhitespace = computed(() => sourceWhitespace.value - resultWhitespace.value)
const activeCount = computed(
  () =>
    [collapseSpaces.value, trimLines.value, removeEmptyLines.value, collapseNewlines.value].filter(
      Boolean
    ).length
)

function onSample() {
  source.value = SAMPLE
}

function onReset() {
  collapseSpaces.value = WS_DEFAULTS.collapseSpaces
  trimLines.value = WS_DEFAULTS.trimLines
  removeEmptyLines.value = WS_DEFAULTS.removeEmptyLines
  collapseNewlines.value = WS_DEFAULTS.collapseNewlines
}
</script>

<template>
  <ToolShell
    title="空白符清理"
    description="压缩连续空格与制表符、清理全角空格与不换行空格、修剪行首尾并按需删空行或合并单行。全部在本地完成。"
  >
    <UiCard>
      <UiSection title="输入文本">
        <UiTextarea v-model="source" :rows="10" mono placeholder="在此粘贴需要清理的文本…" />
        <div class="whitespace__row">
          <div class="whitespace__stats">
            <UiTag variant="neutral">原文 {{ source.length }} 字符</UiTag>
            <UiTag variant="neutral">空白 {{ sourceWhitespace }} 个</UiTag>
          </div>
          <div class="whitespace__actions">
            <UiButton variant="ghost" size="sm" @click="onSample">
              <UiIcon name="sparkles" :size="14" />
              填入示例
            </UiButton>
            <UiButton variant="ghost" size="sm" :disabled="!source" @click="source = ''">
              <UiIcon name="close" :size="14" />
              清空
            </UiButton>
          </div>
        </div>
      </UiSection>

      <UiSection
        title="清理选项"
        description="执行顺序：行尾归一 → 行内压缩 → 行首尾修剪 → 删空行 → 合并单行"
      >
        <div class="whitespace__checks">
          <UiCheckbox v-model="collapseSpaces" :disabled="collapseNewlines">
            压缩行内连续空白（空格 / 制表符 / 全角空格 / 不换行空格）为单个空格
          </UiCheckbox>
          <UiCheckbox v-model="trimLines">去除每行首尾空白，并裁掉整段首尾空行</UiCheckbox>
          <UiCheckbox v-model="removeEmptyLines" :disabled="collapseNewlines">
            删除所有空行（默认保留中间空行）
          </UiCheckbox>
          <UiCheckbox v-model="collapseNewlines">合并为单行（换行也当空白压缩）</UiCheckbox>
        </div>
        <div class="whitespace__row">
          <p v-if="collapseNewlines" class="whitespace__hint">
            已选合并为单行：行内压缩与删空行不再单独生效，全部空白压成单个空格。
          </p>
          <UiButton variant="ghost" size="sm" :disabled="activeCount === 0" @click="onReset">
            <UiIcon name="refresh" :size="14" />
            恢复默认
          </UiButton>
        </div>
      </UiSection>

      <UiSection title="清理结果">
        <div class="whitespace__stats">
          <UiTag variant="neutral">结果 {{ output.length }} 字符</UiTag>
          <UiTag variant="neutral">{{ output ? output.split('\n').length : 0 }} 行</UiTag>
          <UiTag v-if="removedWhitespace > 0" variant="primary">
            清理空白 {{ removedWhitespace }} 个
          </UiTag>
        </div>

        <pre v-if="output" class="whitespace__output">{{ output }}</pre>
        <p v-else class="whitespace__placeholder">没有可输出的内容。</p>

        <div class="whitespace__row">
          <p v-if="activeCount === 0 && source" class="whitespace__hint">
            未启用任何选项，结果与原文一致。
          </p>
          <UiButton
            class="whitespace__submit"
            size="sm"
            :disabled="!output"
            @click="copyText(output, { successMsg: '清理结果已复制' })"
          >
            <UiIcon name="copy" :size="14" />
            复制结果
          </UiButton>
        </div>
      </UiSection>
    </UiCard>

    <UiCard>
      <UiSection title="实现方案对比" description="五种可行实现的处理范围、适用场景与权衡">
        <UiButton variant="ghost" size="sm" @click="showCompare = !showCompare">
          <UiIcon :name="showCompare ? 'chevron-up' : 'chevron-down'" :size="14" />
          {{ showCompare ? '收起对比' : '展开对比' }}
        </UiButton>

        <template v-if="showCompare">
          <div class="whitespace__table-wrap">
            <table class="whitespace__table">
              <thead>
                <tr>
                  <th>方案</th>
                  <th>处理范围</th>
                  <th>适用场景</th>
                  <th>权衡</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>A<br /><code>/\s+/g → ' '</code> + trim</td>
                  <td>所有空白（含换行）压成单个空格，输出单行</td>
                  <td>关键词、单行摘要、搜索索引</td>
                  <td>最简单最快；换行结构丢失，无法按行处理</td>
                </tr>
                <tr>
                  <td>B<br /><code>split(/\s+/).join(' ')</code></td>
                  <td>效果同 A，先切分成词再拼接</td>
                  <td>与 A 相同；需要词元时顺带有用</td>
                  <td>结果一致但多一次数组建表，长文本内存开销更大</td>
                </tr>
                <tr>
                  <td>C<br /><code>/[ \t]+/g</code> 逐行</td>
                  <td>仅 ASCII 空格与制表符；保留换行；行首尾修剪</td>
                  <td>代码片段、对齐表格等需保留行结构的文本</td>
                  <td>结构友好；漏全角空格 U+3000、NBSP U+00A0 等中文排版常见空白</td>
                </tr>
                <tr>
                  <td>D<br /><code>\p{Zs}</code> 属性类</td>
                  <td>精确枚举 Unicode 空格分隔符（Zs）+ 制表符</td>
                  <td>需精确控制「哪些算空格」的国际化文本</td>
                  <td>语义最精确；枚举繁琐易漏 Zl/Zp，需 u 标志，字符集维护成本高</td>
                </tr>
                <tr class="is-recommended">
                  <td>E（推荐）<br /><code>[^\S\n]</code> 两阶段</td>
                  <td>
                    「Unicode 空白减换行」补集压成单空格 + CRLF 归一 + 行首尾修剪，可选删空行 /
                    合并单行
                  </td>
                  <td>通用文本清理：既可保留换行结构，也可按需折叠为单行</td>
                  <td>
                    单个字符类覆盖 D 的全部范围且天然排除换行，无需枚举；单趟扫描性能与 A
                    相当；开关可组合、可测性最好
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="whitespace__spec">
            <h3>推荐方案规范（normalizeWhitespace）</h3>
            <p><strong>输入：</strong>任意字符串（非字符串按空串处理）。</p>
            <p><strong>输出：</strong>归一化后的文本，规则依四个开关组合。</p>
            <p>
              <strong>边界情况：</strong>
              空串 → 空串；纯空白输入（trimLines 开）→ 空串；CRLF / 旧 Mac 换行一律归一为 LF；
              全角空格与 NBSP 压成普通空格；中间空行默认保留，勾选「删除空行」后移除；
              「合并为单行」优先级最高，输出单个空格分隔的单行。
            </p>
          </div>
        </template>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
