// ============================================================
// JWT 解码（纯函数）
// 重要：只做 Base64URL 解码与 JSON 解析，**不校验签名**。
// 「能解出内容」不等于「令牌可信」，签名校验需要密钥或公钥。
// ============================================================
import { base64UrlToText } from './base64'

/** payload 中的标准声明（数组顺序即页面展示顺序） */
export const JWT_CLAIMS = [
  { key: 'iss', label: '签发者 iss' },
  { key: 'sub', label: '主体 sub' },
  { key: 'aud', label: '受众 aud' },
  { key: 'jti', label: '唯一标识 jti' },
  { key: 'iat', label: '签发时间 iat', time: true },
  { key: 'nbf', label: '生效时间 nbf', time: true },
  { key: 'exp', label: '过期时间 exp', time: true },
]

/** 常见签名算法（仅用于展示说明，本工具不做校验） */
export const ALGORITHM_NOTES = {
  HS256: 'HMAC + SHA-256（对称密钥）',
  HS384: 'HMAC + SHA-384（对称密钥）',
  HS512: 'HMAC + SHA-512（对称密钥）',
  RS256: 'RSA + SHA-256（非对称密钥）',
  RS384: 'RSA + SHA-384（非对称密钥）',
  RS512: 'RSA + SHA-512（非对称密钥）',
  ES256: 'ECDSA P-256 + SHA-256（非对称密钥）',
  ES384: 'ECDSA P-384 + SHA-384（非对称密钥）',
  ES512: 'ECDSA P-521 + SHA-512（非对称密钥）',
  PS256: 'RSA-PSS + SHA-256（非对称密钥）',
  PS512: 'RSA-PSS + SHA-512（非对称密钥）',
  none: '未签名（生产环境不应出现）',
}

function decodeSegment(segment, name) {
  let text
  try {
    text = base64UrlToText(segment)
  } catch (err) {
    throw new Error(`${name} 段不是合法的 Base64URL 编码`, { cause: err })
  }
  try {
    return JSON.parse(text)
  } catch (err) {
    throw new Error(`${name} 段解码后不是合法 JSON`, { cause: err })
  }
}

/**
 * 解码 JWT（不校验签名）
 * @param {string} token 支持带 `Bearer ` 前缀
 * @returns {{header:object, payload:object, signature:string}}
 * @throws {Error} 段数不符或解码失败
 */
export function decodeJwt(token) {
  const cleaned = String(token ?? '')
    .trim()
    .replace(/^Bearer\s+/i, '')
  if (!cleaned) throw new Error('请先粘贴 JWT')

  const parts = cleaned.split('.')
  if (parts.length < 2) {
    throw new Error(`JWT 至少需要两段（header.payload），当前只有 ${parts.length} 段`)
  }
  if (parts.length > 3) {
    throw new Error(`JWT 应为三段，当前有 ${parts.length} 段，请确认没有粘贴多余内容`)
  }

  return {
    header: decodeSegment(parts[0], 'Header'),
    payload: decodeSegment(parts[1], 'Payload'),
    signature: parts[2] ?? '',
  }
}

/**
 * 依据 exp / nbf 与当前时间判断令牌时间状态
 * @param {object} payload
 * @param {number} [now] 毫秒时间戳
 * @returns {'expired'|'not-yet'|'valid'|'unknown'}
 */
export function tokenTimeStatus(payload, now = Date.now()) {
  const exp = payload?.exp
  const nbf = payload?.nbf
  const hasExp = typeof exp === 'number'
  const hasNbf = typeof nbf === 'number'
  if (hasExp && exp * 1000 <= now) return 'expired'
  if (hasNbf && nbf * 1000 > now) return 'not-yet'
  if (hasExp || hasNbf) return 'valid'
  return 'unknown'
}
