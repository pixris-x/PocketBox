// ============================================================
// TOTP / HOTP 纯函数（RFC 4226 / 6238）
//   - Base32 解码（RFC 4648，容忍空格、连字符、小写、省略 padding）
//   - HMAC 走 Web Crypto（node 18+ 与浏览器同 API），密钥不出设备
//   - otpauth:// URI 解析，方便直接粘贴身份验证器里导出的链接
// ============================================================

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * Base32 解码为字节
 * @param {string} input
 * @returns {Uint8Array}
 * @throws {Error} 密钥为空或含非法字符
 */
export function base32Decode(input) {
  const clean = String(input ?? '')
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/=+$/, '')
  if (!clean) throw new Error('密钥为空')

  let bits = 0
  let value = 0
  const bytes = []
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) {
      throw new Error(`密钥含非法字符「${char}」：Base32 只允许 A-Z 与 2-7`)
    }
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(bytes)
}

/**
 * 解析 otpauth:// URI
 * @param {string} uri
 * @returns {{secret:string, issuer:string|null, label:string|null, digits:number, period:number, algorithm:string} | null}
 */
export function parseOtpauthUri(uri) {
  const text = String(uri ?? '').trim()
  if (!/^otpauth:\/\//i.test(text)) return null

  let url
  try {
    url = new URL(text)
  } catch {
    return null
  }

  const secret = url.searchParams.get('secret')
  if (!secret) return null

  const label = decodeURIComponent(url.pathname.replace(/^\/+/, '')) || null
  const issuerParam = url.searchParams.get('issuer')
  // 标签形如 "ACME:john@example.com"，冒号前是 issuer
  const issuer = issuerParam || (label && label.includes(':') ? label.split(':')[0].trim() : null)

  return {
    secret,
    issuer: issuer || null,
    label,
    digits: clampInt(url.searchParams.get('digits'), 6, 6, 10),
    period: clampInt(url.searchParams.get('period'), 30, 1, 300),
    algorithm: normalizeAlgorithm(url.searchParams.get('algorithm')),
  }
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function normalizeAlgorithm(value) {
  const upper = String(value ?? 'SHA1')
    .toUpperCase()
    .replace(/-/g, '')
  return upper === 'SHA256' || upper === 'SHA512' ? upper : 'SHA1'
}

function counterToBytes(counter) {
  const bytes = new Uint8Array(8)
  let value = Math.floor(counter)
  for (let i = 7; i >= 0; i--) {
    bytes[i] = value & 0xff
    value = Math.floor(value / 256)
  }
  return bytes
}

/** RFC 4226 动态截断 */
function dynamicTruncate(bytes) {
  const offset = bytes[bytes.length - 1] & 0x0f
  return (
    ((bytes[offset] & 0x7f) << 24) |
    ((bytes[offset + 1] & 0xff) << 16) |
    ((bytes[offset + 2] & 0xff) << 8) |
    (bytes[offset + 3] & 0xff)
  )
}

/**
 * HOTP：基于计数器的动态码
 * @param {string | Uint8Array} secret Base32 字符串或已解码密钥
 * @param {number} counter
 * @param {{digits?: number, algorithm?: 'SHA1'|'SHA256'|'SHA512'}} [options]
 * @returns {Promise<string>}
 */
export async function generateHotp(secret, counter, { digits = 6, algorithm = 'SHA1' } = {}) {
  const keyBytes = typeof secret === 'string' ? base32Decode(secret) : secret
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: `SHA-${algorithm.replace(/^SHA/, '')}` },
    false,
    ['sign']
  )
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterToBytes(counter)))
  const code = dynamicTruncate(mac) % 10 ** digits
  return String(code).padStart(digits, '0')
}

/**
 * TOTP：基于时间的动态码
 * @param {string | Uint8Array} secret
 * @param {{timestamp?: number, digits?: number, period?: number, algorithm?: string}} [options]
 * @returns {Promise<{code:string, remaining:number, period:number, progress:number}>}
 */
export async function generateTotp(secret, options = {}) {
  const { timestamp = Date.now(), digits = 6, period = 30, algorithm = 'SHA1' } = options
  const counter = Math.floor(timestamp / 1000 / period)
  const code = await generateHotp(secret, counter, { digits, algorithm })
  const elapsed = Math.floor(timestamp / 1000) % period
  const remaining = period - elapsed
  return { code, remaining, period, progress: remaining / period }
}
