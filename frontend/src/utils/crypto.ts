/**
 * 端到端加密工具模块 (E2EE - End-to-End Encryption)
 * 基于浏览器原生 Web Cryptography API (AES-256-GCM)
 * 手机号等高敏感字段在离开设备前即被加密，服务器端零知识存储，无法逆向
 */

import { getUserInfo } from './auth'

const E2EE_STORAGE_PREFIX = 'clx_e2ee_key_'

/**
 * ArrayBuffer 转 Base64 字符串
 */
function bufferToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Base64 字符串转 Uint8Array
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * 获取当前用户的密钥存储键
 */
function getStorageKey(userId?: string): string {
  const uid = userId || getUserInfo()?.id || 'default'
  return `${E2EE_STORAGE_PREFIX}${uid}`
}

/**
 * 获取或自动生成当前用户的 256 位 AES-GCM CryptoKey
 */
export async function getOrCreateUserKey(userId?: string): Promise<CryptoKey> {
  const storageKey = getStorageKey(userId)
  const savedBase64Key = uni.getStorageSync(storageKey)

  if (savedBase64Key && typeof savedBase64Key === 'string') {
    try {
      const rawBytes = base64ToBuffer(savedBase64Key)
      return await crypto.subtle.importKey(
        'raw',
        rawBytes,
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
      )
    } catch (err) {
      console.warn('解析已保存的 E2EE 密钥失败，正在重新生成:', err)
    }
  }

  // 首次使用自动生成 256 位 AES-GCM 强密钥
  const newKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )

  // 导出为 base64 并持久化到本地存储
  const rawExported = await crypto.subtle.exportKey('raw', newKey)
  const base64Key = bufferToBase64(rawExported)
  uni.setStorageSync(storageKey, base64Key)

  return newKey
}

/**
 * 导出当前用户的密钥（Base64 字符串），供用户安全备份
 */
export async function exportUserKey(userId?: string): Promise<string> {
  const storageKey = getStorageKey(userId)
  const savedBase64Key = uni.getStorageSync(storageKey)
  if (savedBase64Key && typeof savedBase64Key === 'string') {
    return savedBase64Key
  }
  const key = await getOrCreateUserKey(userId)
  const raw = await crypto.subtle.exportKey('raw', key)
  return bufferToBase64(raw)
}

/**
 * 导入外来密钥（例如换机同步），覆盖当前存储
 */
export async function importUserKey(base64Key: string, userId?: string): Promise<CryptoKey> {
  const trimmed = base64Key.trim()
  const rawBytes = base64ToBuffer(trimmed)
  const key = await crypto.subtle.importKey(
    'raw',
    rawBytes,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  )
  const storageKey = getStorageKey(userId)
  uni.setStorageSync(storageKey, trimmed)
  return key
}

/**
 * 加密单个文本字段（如手机号）
 * 返回格式：enc:v1:<base64-iv>:<base64-ciphertext>
 */
export async function encryptField(plaintext: string | undefined | null, key?: CryptoKey): Promise<string> {
  if (!plaintext || typeof plaintext !== 'string') {
    return ''
  }
  const trimmed = plaintext.trim()
  if (!trimmed) return ''

  // 若已经是加密格式，无需重复加密
  if (trimmed.startsWith('enc:v1:')) {
    return trimmed
  }

  const activeKey = key || (await getOrCreateUserKey())
  // AES-GCM 推荐使用 12 字节（96-bit）的随机 IV
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(trimmed)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    activeKey,
    encoded
  )

  return `enc:v1:${bufferToBase64(iv)}:${bufferToBase64(ciphertext)}`
}

/**
 * 解密单个文本字段
 * 若不是 enc:v1: 开头，说明是历史明文数据，原样安全返回
 */
export async function decryptField(encryptedStr: string | undefined | null, key?: CryptoKey): Promise<string> {
  if (!encryptedStr || typeof encryptedStr !== 'string') {
    return ''
  }
  const trimmed = encryptedStr.trim()
  if (!trimmed) return ''

  // 历史明文数据直接返回
  if (!trimmed.startsWith('enc:v1:')) {
    return trimmed
  }

  const parts = trimmed.split(':')
  if (parts.length !== 4) {
    return trimmed
  }

  try {
    const activeKey = key || (await getOrCreateUserKey())
    const iv = base64ToBuffer(parts[2])
    const ciphertext = base64ToBuffer(parts[3])

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      activeKey,
      ciphertext
    )

    return new TextDecoder().decode(decrypted)
  } catch (err) {
    console.error('端到端字段解密失败:', err)
    return '[未解密]'
  }
}

/**
 * 校验字段是否为加密状态
 */
export function isEncrypted(str?: string | null): boolean {
  return typeof str === 'string' && str.startsWith('enc:v1:')
}
