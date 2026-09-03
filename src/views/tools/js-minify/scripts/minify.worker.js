// ============================================================
// terser 压缩 Web Worker（页面专属脚本）
// 通过 Vite 的 ?worker 引入，避免主线程被大文件压缩阻塞
// ============================================================
import { minify } from 'terser'

self.onmessage = async (event) => {
  const { code, compress, mangle } = event.data
  try {
    const result = await minify(code, {
      compress: compress ? {} : false,
      mangle: !!mangle,
      format: { comments: false },
    })
    self.postMessage({ ok: true, code: result.code })
  } catch (err) {
    self.postMessage({ ok: false, error: err && err.message ? err.message : String(err) })
  }
}
