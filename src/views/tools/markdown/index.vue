<script setup>
// Markdown 预览：左侧输入、右侧实时渲染，纯本地
// 预览放在 sandbox iframe 中（不给脚本权限），避免粘贴内容里的脚本影响主页面
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ToolShell from '@/components/ToolShell/index.vue'
import { copyText } from '@/common/utils/copy'
import { downloadText } from '@/common/utils/download'
import { buildPreviewDocument, renderMarkdown } from '@/common/utils/markdown'
import { toast } from '@/common/utils/toast'
import { printHtmlDocument } from './scripts/export-pdf'

const SAMPLE = `# PocketBox 工具箱

把常用的开发小工具放在一个页面里，**全部在浏览器本地完成**。

## 支持的格式

| 语法 | 效果 |
| --- | --- |
| 标题 | \`#\` ~ \`######\` |
| 强调 | \`**粗体**\` / \`*斜体*\` |
| 代码 | 行内 \`code\` 与代码块 |
| 列表 | \`-\` / \`1.\` |
| 引用 | \`>\` |

> 提示：右侧预览与实际渲染一致，可直接复制 HTML 或下载 .html 文件。

\`\`\`js
// 代码块示例
const tools = ['markdown', 'yaml-json', 'curl-convert']
console.log(tools.join(', '))
\`\`\`

- [x] 实时预览
- [ ] 导出 PDF（未支持）
`

const input = ref(SAMPLE)
const isDark = ref(false)

const rendered = computed(() => renderMarkdown(input.value))
const previewDoc = computed(() =>
  buildPreviewDocument(rendered.value.ok ? rendered.value.html : '', { dark: isDark.value })
)

let themeObserver = null

function readTheme() {
  isDark.value = document.documentElement.dataset.theme === 'dark'
}

onMounted(() => {
  readTheme()
  // 跟随站点主题切换（明暗），预览样式同步更新
  themeObserver = new MutationObserver(readTheme)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
})

onUnmounted(() => themeObserver?.disconnect())

function onCopyHtml() {
  copyText(rendered.value.ok ? rendered.value.html : '', { successMsg: 'HTML 已复制' })
}

function onDownloadHtml() {
  downloadText('markdown-preview.html', previewDoc.value, 'text/html;charset=utf-8')
}

const exporting = ref(false)

async function onExportPdf() {
  if (exporting.value) return
  exporting.value = true
  try {
    const doc = buildPreviewDocument(rendered.value.ok ? rendered.value.html : '', {
      forPrint: true,
    })
    await printHtmlDocument(doc)
    toast('已打开打印对话框，目标选择「另存为 PDF」即可', 'info', 4200)
  } catch {
    toast.error('导出失败，请重试')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <ToolShell
    title="Markdown 预览"
    description="左侧输入 Markdown，右侧实时渲染（支持 GFM 表格、任务列表、代码块）。可复制 HTML、下载 .html 或导出 PDF。内容不上传，全部本地渲染。"
  >
    <UiCard>
      <UiSection title="编辑与预览">
        <div class="markdown__split">
          <div class="markdown__pane">
            <UiTextarea
              v-model="input"
              :rows="18"
              mono
              placeholder="在此输入 Markdown…"
              class="markdown__input"
            />
            <div class="markdown__actions">
              <UiButton variant="ghost" size="sm" @click="input = SAMPLE">
                <UiIcon name="sparkles" :size="14" />
                填入示例
              </UiButton>
              <UiButton variant="ghost" size="sm" :disabled="!input" @click="input = ''">
                <UiIcon name="close" :size="14" />
                清空
              </UiButton>
            </div>
          </div>

          <div class="markdown__pane">
            <iframe
              class="markdown__preview"
              title="Markdown 预览"
              sandbox=""
              :srcdoc="previewDoc"
            />
            <div class="markdown__actions">
              <UiButton variant="ghost" size="sm" @click="onCopyHtml">
                <UiIcon name="copy" :size="14" />
                复制 HTML
              </UiButton>
              <UiButton variant="ghost" size="sm" @click="onDownloadHtml">
                <UiIcon name="download" :size="14" />
                下载 .html
              </UiButton>
              <UiButton
                size="sm"
                class="markdown__download"
                :loading="exporting"
                @click="onExportPdf"
              >
                <UiIcon name="file-text" :size="14" />
                导出 PDF
              </UiButton>
            </div>
          </div>
        </div>
        <p v-if="!rendered.ok" class="markdown__error">{{ rendered.error }}</p>
      </UiSection>
    </UiCard>
  </ToolShell>
</template>

<style lang="scss" scoped>
@use './style.scss';
</style>
