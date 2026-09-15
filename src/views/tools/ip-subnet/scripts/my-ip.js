// ============================================================
// 查询访问者自己的公网 IP
// 只请求本站同源端点 /api/ip（实现在 deploy/server.js），不经过任何第三方服务，
// 因此访问者的 IP 不会落到别人手里；服务端也不写日志。
// ============================================================

export async function fetchMyIp() {
  let response
  try {
    response = await fetch('/api/ip', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
  } catch {
    throw new Error('请求失败，请检查网络或服务是否可用')
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    // vite dev 与纯静态托管没有这个端点，SPA fallback 会返回 index.html
    throw new Error('当前运行方式没有 /api/ip 端点（仅容器部署可用），请改用「IP 归属地」手动查询')
  }
  if (!response.ok) {
    throw new Error(`端点返回 HTTP ${response.status}`)
  }

  const data = await response.json()
  if (!data || typeof data.ip !== 'string' || !data.ip) {
    throw new Error('端点未返回有效的 IP')
  }
  return data.ip
}
