// ============================================================
// 运行环境判定：是否为桌面端（Electron）
// 主判据是 preload 暴露的 window.pocketbox.desktop，
// UA 兜底覆盖 preload 未注入的场景（如桌面端里以 http 方式打开页面）。
// SW 注册与底部栏隐私文案都依赖它，判定口径必须只有这一处。
// ============================================================

export function isDesktop() {
  if (typeof window === 'undefined') return false
  return window.pocketbox?.desktop === true || /Electron\//.test(navigator.userAgent || '')
}
