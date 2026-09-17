// ============================================================
// 二维码文本分类纯函数（无依赖、无 DOM）
// jsQR 解出的是纯文本；这里把常见二维码内容识别为可操作的类型：
//   - URL（http/https）→ 可直接打开
//   - WIFI 分享码（WIFI:T:WPA;S:ssid;P:pwd;H:false;;）→ 结构化字段
//   - 其余一律视为普通文本
// ============================================================

/**
 * @param {string} text jsQR 解出的原始文本
 * @returns {{type:'empty'} | {type:'url', url:string}
 *          | {type:'wifi', wifi:{ssid:string|null,password:string|null,encryption:string|null,hidden:boolean}}
 *          | {type:'text', text:string}}
 */
export function classifyQrText(text) {
  if (typeof text !== 'string') return { type: 'empty' }
  const value = text.trim()
  if (value === '') return { type: 'empty' }

  if (/^https?:\/\//i.test(value)) {
    return { type: 'url', url: value }
  }
  if (/^wifi:/i.test(value)) {
    return { type: 'wifi', wifi: parseWifiFields(value) }
  }
  return { type: 'text', text: value }
}

/** 解析 WIFI 分享码字段；键为单字母 T/S/P/H，大小写不敏感；转义字符（\; 等）不展开 */
function parseWifiFields(text) {
  const body = text.replace(/^wifi:/i, '')
  const fields = {}
  for (const part of body.split(';')) {
    const index = part.indexOf(':')
    if (index <= 0) continue
    const key = part.slice(0, index).trim().toUpperCase()
    fields[key] = part.slice(index + 1)
  }
  return {
    ssid: fields.S ?? null,
    password: fields.P ?? null,
    encryption: fields.T ?? null,
    hidden: (fields.H || '').toLowerCase() === 'true',
  }
}
