import crypto from 'crypto'

/**
 * Hashes a plaintext password using PBKDF2.
 * @param password The plaintext password
 * @returns A string in the format salt:hash
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

/**
 * Verifies a plaintext password against a stored salt:hash string.
 * @param password The plaintext password to check
 * @param storedHash The stored salt:hash string
 * @returns true if verified, false otherwise
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return false
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return hash === verifyHash
}
