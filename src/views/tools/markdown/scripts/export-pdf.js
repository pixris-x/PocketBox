// ============================================================
// 页面专属：把整份 HTML 文档交给打印管线导出 PDF
// 为什么用打印：零依赖、文字可选中、中文无需嵌入字体（pdf-lib 等方案要带字体文件）。
// 安全：iframe 只开 allow-modals + allow-same-origin —— 能取高度与弹打印框，
//       但没有 allow-scripts，Markdown 里夹带的 <script> 不会执行。
// ============================================================

/**
 * 打开浏览器打印对话框（用户在目标里选「另存为 PDF」）
 * @param {string} documentHtml 完整 HTML 文档（见 markdown.js 的 buildPreviewDocument）
 * @returns {Promise<void>} iframe 加载完成并触发打印后 resolve
 */
export function printHtmlDocument(documentHtml) {
  const frame = document.createElement('iframe')
  frame.setAttribute('sandbox', 'allow-modals allow-same-origin')
  frame.setAttribute('aria-hidden', 'true')
  // A4 内容宽度；高度先给 0，加载后按实际内容撑开，避免打印时被裁剪
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:794px;height:0;border:0;visibility:hidden'
  frame.srcdoc = documentHtml
  document.body.appendChild(frame)

  return new Promise((resolve) => {
    frame.addEventListener(
      'load',
      () => {
        let height = 1123
        try {
          height = frame.contentDocument?.documentElement?.scrollHeight || height
        } catch {
          // 极端情况下拿不到高度：退回 A4 单页高度，至少不报错
        }
        frame.style.height = `${Math.min(Math.max(height, 200), 20000)}px`

        requestAnimationFrame(() => {
          try {
            frame.contentWindow?.focus()
            frame.contentWindow?.print()
          } catch {
            // 用户可能禁用打印；忽略，由调用方决定提示
          }
          resolve()
          // 打印对话框可能停留较久，延迟回收 iframe
          setTimeout(() => frame.remove(), 60000)
        })
      },
      { once: true }
    )
  })
}
