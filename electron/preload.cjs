// 预加载脚本：仅暴露「桌面环境标识」，供渲染层跳过 Service Worker 等浏览器专属逻辑。
// sandbox 开启下 contextBridge 仍可用；不暴露任何 Node / IPC 能力。
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('pocketbox', {
  desktop: true,
})
