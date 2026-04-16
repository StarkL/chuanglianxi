import crypto from 'node:crypto'

export interface DecryptedContact {
  name: string
  phoneNumber: string
}

/**
 * Decrypts WeChat contact data (encryptedData + iv) using the session key.
 * Uses AES-256-CBC algorithm as specified by WeChat's encryption standard.
 *
 * @param sessionKey - Base64-encoded WeChat session key from code2Session
 * @param iv - Base64-encoded initialization vector from wx.chooseContact
 * @param encryptedData - Base64-encoded encrypted contact data
 * @returns Decrypted contact with name and phoneNumber
 */
export function decryptWeChatContact(
  sessionKey: string,
  iv: string,
  encryptedData: string
): DecryptedContact {
  const keyBuffer = Buffer.from(sessionKey, 'base64')
  const ivBuffer = Buffer.from(iv, 'base64')
  const encryptedBuffer = Buffer.from(encryptedData, 'base64')

  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer)
  decipher.setAutoPadding(true)

  let decrypted = decipher.update(encryptedBuffer, undefined, 'utf8')
  decrypted += decipher.final('utf8')

  const parsed = JSON.parse(decrypted)

  return {
    name: parsed.name || parsed.displayName || '未知',
    phoneNumber: parsed.phoneNumber || parsed.phone || '',
  }
}
