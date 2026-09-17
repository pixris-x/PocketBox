// ============================================================
// IP 查询：只请求本站服务端 API（backend/PocketBox.Api），不经任何第三方。
//   fetchMyIp()          GET {API_BASE}/api/ip          → 访问者自己的公网 IP
//   lookupRegion(ip?)    GET {API_BASE}/api/ip/region   → 归属地，省略 ip 即查访问者自己
// 服务端实现见 backend/PocketBox.Api/Endpoints/IpEndpoints.cs
// API_BASE：Web 构建不设置 → 空串，走同源相对路径（nginx 分流）；
//           Electron 构建由 scripts/electron-build.mjs 注入线上地址（CORS 白名单 app://pocketbox）。
// ============================================================

const API_BASE = import.meta.env.VITE_API_BASE || ''

async function requestJson(url) {
  let response
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  } catch {
    throw new Error('请求失败，请检查网络或服务是否可用')
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    // 拿到 HTML 说明请求根本没到 API：静态服务的 SPA fallback 把 /api/xxx 当成了前端路由。
    // 常见原因是 nginx 没配 /api 分流，或 vite dev 没开 proxy —— 不是"后端没启动"。
    throw new Error(
      '未拿到 JSON 响应：请确认 /api 已正确转发（nginx 分流或 vite proxy）且后端正在运行'
    )
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.message || `请求失败（HTTP ${response.status}）`)
  }
  if (!data) {
    throw new Error('服务端返回了无法解析的内容')
  }
  return data
}

export async function fetchMyIp() {
  const data = await requestJson(`${API_BASE}/api/ip`)
  if (!data.ip) {
    throw new Error('服务端未返回有效的 IP')
  }
  return data.ip
}

export async function lookupRegion(ip) {
  const text = String(ip ?? '').trim()
  const url = text
    ? `${API_BASE}/api/ip/region?ip=${encodeURIComponent(text)}`
    : `${API_BASE}/api/ip/region`
  return requestJson(url)
}
