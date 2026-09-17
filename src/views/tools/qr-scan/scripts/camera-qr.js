// ============================================================
// 摄像头实时扫码：getUserMedia + 逐帧 jsQR（纯浏览器能力，无依赖新增）
// 用法：
//   const scanner = createCameraScanner(videoEl, canvasEl)
//   await scanner.start((text) => { ... })  // 识别成功后自动停止
//   scanner.stop()                          // 手动停止 / 组件卸载时调用
// ============================================================
import jsQR from 'jsqr'

export function createCameraScanner(videoEl, canvasEl) {
  let stream = null
  let rafId = 0
  let stopped = false

  async function start(onResult) {
    stopped = false
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
    } catch {
      throw new Error('无法访问摄像头：请检查权限，且页面需运行在 HTTPS 或 localhost 环境')
    }

    videoEl.srcObject = stream
    await videoEl.play()

    const ctx = canvasEl.getContext('2d', { willReadFrequently: true })
    const loop = () => {
      if (stopped) return
      if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
        canvasEl.width = videoEl.videoWidth
        canvasEl.height = videoEl.videoHeight
        ctx.drawImage(videoEl, 0, 0)
        const image = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height)
        const code = jsQR(image.data, image.width, image.height)
        if (code && code.data) {
          stop()
          onResult(code.data)
          return
        }
      }
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
  }

  function stop() {
    stopped = true
    cancelAnimationFrame(rafId)
    if (stream) {
      for (const track of stream.getTracks()) track.stop()
      stream = null
    }
  }

  return { start, stop }
}
