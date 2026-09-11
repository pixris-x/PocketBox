<script setup>
// JSON 工具页：格式化 / 压缩 / 校验（文本模式）+ 层级树视图（含路径定位、节点复制）
// 树的算法在 common/utils/json-tree.js，解析错误提示复用 json.js 的行列定位
import { computed, nextTick, ref, watch } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { useToast } from '@/common/utils/toast'
import { formatJson, minifyJson, parseJson } from '@/common/utils/json'
import {
  buildJsonTree,
  collectContainerPaths,
  collectPathsUntilDepth,
  describeSize,
  flattenTree,
  previewValue,
  summarizeTree,
  valueToText,
} from '@/common/utils/json-tree'

const { success, error: showError } = useToast()

const SAMPLE = JSON.stringify(
  {
    name: 'pocketBox',
    version: '1.2.0',
    enabled: true,
    tags: ['json', 'tree', 'view'],
    author: { name: 'pixris', site: null },
    stats: { tools: 23, tests: 487 },
  },
  null,
  2
)

const indentOptions = [
  { label: '2 空格', value: 2 },
  { label: '4 空格', value: 4 },
  { label: 'Tab', value: 'tab' },
]

const depthOptions = [
  { label: '展开 1 层', value: 1 },
  { label: '展开 2 层', value: 2 },
  { label: '展开 3 层', value: 3 },
  { label: '展开 5 层', value: 5 },
]

const viewTabs = [
  { label: '树视图', value: 'tree' },
  { label: '文本输出', value: 'text' },
]

const input = ref('')
const activeTab = ref('tree')
const indent = ref(2)
const sortKeys = ref(false)
const output = ref('')
const outputError = ref('')

const tree = ref(null)
const treeError = ref('')
const expandedPaths = ref(new Set())
const defaultDepth = ref(2)

// 树视图锚点：生成树后平滑滚动到此处
const treeAnchor = ref(null)

const stats = computed(() => (tree.value ? summarizeTree(tree.value) : null))
const rows = computed(() => (tree.value ? flattenTree(tree.value, expandedPaths.value) : []))

/** 平滑滚动到树视图（尊重系统的「减少动态效果」偏好） */
function scrollToTree() {
  nextTick(() => {
    const el = treeAnchor.value
    if (!el) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  })
}

/** 根节点 key 为 null，展示为「JSON」 */
function nodeLabel(node) {
  return node.key === null ? 'JSON' : node.key
}

/** 行值区：容器展开时留空（贴参考样式），折叠时给摘要；叶子给值 */
function rowValue(row) {
  const { node, hasChildren, expanded } = row
  if (!hasChildren) return previewValue(node)
  if (expanded) return ''
  return node.type === 'object' ? `{ … } ${describeSize(node)}` : `[ … ] ${describeSize(node)}`
}

// ---------- 文本模式 ----------
function doFormat() {
  outputError.value = ''
  try {
    output.value = formatJson(input.value, {
      indent: indent.value === 'tab' ? '\t' : Number(indent.value),
      sortKeys: sortKeys.value,
    })
    activeTab.value = 'text'
  } catch (err) {
    output.value = ''
    outputError.value = err.message
  }
}

function doMinify() {
  outputError.value = ''
  try {
    output.value = minifyJson(input.value)
    activeTab.value = 'text'
  } catch (err) {
    output.value = ''
    outputError.value = err.message
  }
}

function doValidate() {
  outputError.value = ''
  try {
    parseJson(input.value)
    success('JSON 格式有效 ✓')
  } catch (err) {
    outputError.value = err.message
  }
}

// ---------- 树视图 ----------
function buildTree({ silent = false } = {}) {
  treeError.value = ''

  if (!input.value.trim()) {
    tree.value = null
    if (!silent) showError('请先输入 JSON 内容')
    return
  }

  try {
    tree.value = buildJsonTree(input.value)
    expandedPaths.value = new Set(collectPathsUntilDepth(tree.value, defaultDepth.value))
    activeTab.value = 'tree'
    if (!silent) scrollToTree()
  } catch (err) {
    tree.value = null
    treeError.value = err.message
    if (!silent) showError('解析失败，请检查输入')
  }
}

function expandAll() {
  if (!tree.value) return
  expandedPaths.value = new Set(collectContainerPaths(tree.value))
}

function collapseAll() {
  expandedPaths.value = tree.value ? new Set(['$']) : new Set()
}

watch(defaultDepth, () => {
  if (!tree.value) return
  expandedPaths.value = new Set(collectPathsUntilDepth(tree.value, defaultDepth.value))
})

// 切到树视图时，若还没生成过树且输入有内容，自动解析一次
watch(activeTab, (tab) => {
  if (tab === 'tree' && !tree.value && input.value.trim()) buildTree({ silent: true })
})

function toggleRow(node) {
  const next = new Set(expandedPaths.value)
  if (next.has(node.path)) next.delete(node.path)
  else next.add(node.path)
  expandedPaths.value = next
}

function loadSample() {
  input.value = SAMPLE
  buildTree()
}

function reset() {
  input.value = ''
  output.value = ''
  outputError.value = ''
  tree.value = null
  treeError.value = ''
  expandedPaths.value = new Set()
  activeTab.value = 'tree'
}
</script>

<template>
  <ToolShell
    title="JSON 工具"
    description="格式化、压缩、校验与层级树视图；树视图支持路径定位与节点值复制，数据不外发。"
  >
    <UiCard>
      <UiSection title="输入 JSON">
        <UiTextarea
          v-model="input"
          :rows="8"
          mono
          placeholder='粘贴 JSON，例如：{"name":"pocketBox","tags":["json"]}'
        />
        <div class="json-toolbar">
          <div class="json-toolbar__left">
            <UiButton @click="doFormat">
              <UiIcon name="braces" :size="15" />
              格式化
            </UiButton>
            <UiButton variant="secondary" @click="doMinify">
              <UiIcon name="code" :size="15" />
              压缩
            </UiButton>
            <UiButton variant="ghost" @click="doValidate">
              <UiIcon name="check" :size="15" />
              校验
            </UiButton>
            <UiButton variant="secondary" @click="buildTree()">
              <UiIcon name="sitemap" :size="15" />
              生成树
            </UiButton>
            <UiButton variant="ghost" size="sm" @click="loadSample">示例</UiButton>
            <UiButton variant="ghost" size="sm" @click="reset">重置</UiButton>
          </div>
          <div class="json-toolbar__right">
            <UiSelect v-model="indent" :options="indentOptions" />
            <div class="json-toolbar__sort">
              <UiSwitch v-model="sortKeys" />
              <span>排序键</span>
            </div>
          </div>
        </div>

        <p v-if="outputError || treeError" class="json-error">
          <UiIcon name="alert-circle" :size="15" />
          <span>{{ outputError || treeError }}</span>
        </p>
      </UiSection>

      <div ref="treeAnchor" class="json-tabs">
        <UiTabs v-model="activeTab" :tabs="viewTabs" />
      </div>

      <!-- 树视图 -->
      <template v-if="activeTab === 'tree'">
        <template v-if="tree">
          <UiSection title="结构概览">
            <div class="jtree-stats">
              <div class="jtree-stats__item">
                <span class="jtree-stats__value">{{ stats.total }}</span>
                <span class="jtree-stats__label">节点总数</span>
              </div>
              <div class="jtree-stats__item">
                <span class="jtree-stats__value">{{ stats.containers }}</span>
                <span class="jtree-stats__label">容器</span>
              </div>
              <div class="jtree-stats__item">
                <span class="jtree-stats__value">{{ stats.leaves }}</span>
                <span class="jtree-stats__label">叶子值</span>
              </div>
              <div class="jtree-stats__item">
                <span class="jtree-stats__value">{{ stats.maxDepth }}</span>
                <span class="jtree-stats__label">最大层级</span>
              </div>
            </div>
          </UiSection>

          <UiSection title="层级树">
            <div class="jtree-bar">
              <UiSelect v-model="defaultDepth" :options="depthOptions" />
              <UiButton variant="secondary" size="sm" @click="expandAll">
                <UiIcon name="chevron-down" :size="14" />
                全部展开
              </UiButton>
              <UiButton variant="ghost" size="sm" @click="collapseAll">
                <UiIcon name="chevron-up" :size="14" />
                全部折叠
              </UiButton>
            </div>

            <div class="jtree">
              <div v-for="row in rows" :key="row.node.path" class="jtree__row">
                <span
                  v-for="index in row.node.depth"
                  :key="index"
                  class="jtree__guide"
                  aria-hidden="true"
                />
                <button
                  v-if="row.hasChildren"
                  class="jtree__toggle"
                  type="button"
                  :aria-expanded="row.expanded"
                  :aria-label="row.expanded ? '折叠' : '展开'"
                  @click="toggleRow(row.node)"
                >
                  <UiIcon :name="row.expanded ? 'chevron-down' : 'chevron-right'" :size="11" />
                </button>
                <span v-else class="jtree__toggle jtree__toggle--leaf" />

                <span class="jtree__key">{{ nodeLabel(row.node) }}</span>
                <span class="jtree__colon">:</span>
                <span class="jtree__value" :class="`is-${row.node.type}`">{{ rowValue(row) }}</span>

                <button
                  class="jtree__copy"
                  type="button"
                  aria-label="复制该节点的值"
                  @click="copyText(valueToText(row.node))"
                >
                  <UiIcon name="copy" :size="14" />
                </button>
              </div>
            </div>
          </UiSection>
        </template>
        <p v-else-if="!treeError" class="json-empty-hint">
          粘贴 JSON 后点上方「生成树」，或点「示例」快速预览
        </p>
      </template>

      <!-- 文本输出 -->
      <template v-else>
        <UiSection v-if="output" title="输出">
          <UiTextarea :model-value="output" :rows="10" mono readonly />
          <div class="json-actions">
            <UiButton variant="secondary" size="sm" @click="copyText(output)">
              <UiIcon name="copy" :size="14" />
              复制结果
            </UiButton>
          </div>
        </UiSection>
        <p v-else class="json-empty-hint">点上方「格式化」或「压缩」查看结果</p>
      </template>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
