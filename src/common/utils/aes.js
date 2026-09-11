// ============================================================
// AES-GCM 文本加解密（基于 Web Crypto，无第三方依赖）
// 注意：crypto.subtle 只在「安全上下文」可用（HTTPS 或 localhost）。
//
// 密文封装格式（Base64 前为一个版本字节，便于将来升级格式）：
//   [0x01][salt 16B][iv 12B][AES-GCM ciphertext(含认证标签)]
//   · salt：PBKDF2 每次加密随机生成，同口令不同密文也不同
//   · iv：GCM 建议 96bit，每次加密随机生成，绝不复用
//   · GCM 自带认证：口令错误或密文被篡改都会解密失败，无需另附校验值
// ============================================================

const FORMAT_VERSION = 0x01
const SALT_BYTES = 16
const IV_BYTES = 12
const KEY_ALGORITHM = 'AES-GCM'

/** PBKDF2 迭代次数（OWASP 2023 对 PBKDF2-HMAC-SHA256 的推荐值） */
export const PBKDF2_ITERATIONS = 310000

/** 当前环境是否支持 Web Crypto 加解密（需 HTTPS 或 localhost） */
export function isWebCryptoAvailable() {
  return (
    typeof globalThis.crypto?.subtle?.deriveKey === 'function' &&
    typeof globalThis.crypto?.subtle?.encrypt === 'function'
  )
}

function ensureReady() {
  if (!isWebCryptoAvailable()) {
    throw new Error('当前环境不支持 Web Crypto，加解密需要以 HTTPS 或 localhost 访问')
  }
}

function randomBytes(length) {
  const buf = new Uint8Array(length)
  globalThis.crypto.getRandomValues(buf)
  return buf
}

/** 口令 → AES-GCM 密钥（PBKDF2-HMAC-SHA256 派生） */
async function deriveKey(password, salt, iterations) {
  const material = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(password)),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return globalThis.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: KEY_ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function toBase64(bytes) {
  let bin = ''
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return btoa(bin)
}

function fromBase64(b64) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/**
 * 文本加密。同一段明文与口令，每次结果都不同（盐与 IV 均随机）。
 * 迭代次数是格式的一部分（ PBKDF2_ITERATIONS 常量），不作为参数暴露，
 * 以免加密侧自定义后解密侧无法还原。
 * @param {string} text
 * @param {string} password
 * @returns {Promise<string>} Base64 密文（含盐、IV 与版本字节）
 */
export async function encryptText(text, password) {
  ensureReady()
  if (typeof password !== 'string' || password === '') {
    throw new Error('口令不能为空')
  }
  const iterations = PBKDF2_ITERATIONS
  const salt = randomBytes(SALT_BYTES)
  const iv = randomBytes(IV_BYTES)
  const key = await deriveKey(password, salt, iterations)
  const cipher = new Uint8Array(
    await globalThis.crypto.subtle.encrypt(
      { name: KEY_ALGORITHM, iv },
      key,
      new TextEncoder().encode(String(text ?? ''))
    )
  )
  // 头部（版本字节）长度不参与 base64 对齐计算，直接拼接
  const payload = new Uint8Array(1 + salt.length + iv.length + cipher.length)
  payload[0] = FORMAT_VERSION
  payload.set(salt, 1)
  payload.set(iv, 1 + salt.length)
  payload.set(cipher, 1 + salt.length + iv.length)
  return toBase64(payload)
}

/**
 * 解密。口令错误或密文被篡改时抛出可读错误（GCM 认证失败）。
 * @param {string} payload encryptText 的输出
 * @param {string} password
 * @returns {Promise<string>} 原文
 */
export async function decryptText(payload, password) {
  ensureReady()
  if (typeof password !== 'string' || password === '') {
    throw new Error('口令不能为空')
  }
  let bytes
  try {
    bytes = fromBase64(String(payload ?? '').trim())
  } catch {
    throw new Error('密文不是有效的 Base64，无法解密')
  }
  const headerEnd = 1 + SALT_BYTES + IV_BYTES
  if (bytes.length <= headerEnd || bytes[0] !== FORMAT_VERSION) {
    throw new Error('密文格式不正确：不是本工具生成的密文（或已损坏）')
  }
  const salt = bytes.slice(1, 1 + SALT_BYTES)
  const iv = bytes.slice(1 + SALT_BYTES, headerEnd)
  const cipher = bytes.slice(headerEnd)
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS)
  try {
    const plain = await globalThis.crypto.subtle.decrypt({ name: KEY_ALGORITHM, iv }, key, cipher)
    return new TextDecoder().decode(plain)
  } catch {
    throw new Error('解密失败：口令不正确，或密文已损坏 / 被篡改')
  }
}
