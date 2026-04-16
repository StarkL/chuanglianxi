import { describe, it, expect } from 'vitest'
import { generateToken, verifyToken } from './auth.js'

describe('auth', () => {
  it('generateToken returns a signed JWT string', async () => {
    const token = await generateToken({ sub: 'user-123', openId: 'wx-abc' })
    expect(token).toMatch(/^ey[A-Za-z0-9_-]+\.ey[A-Za-z0-9_-]+.[A-Za-z0-9_-]+$/)
  })

  it('verifyToken decodes a valid token correctly', async () => {
    const token = await generateToken({ sub: 'user-123', openId: 'wx-abc' })
    const payload = await verifyToken(token)
    expect(payload.sub).toBe('user-123')
    expect(payload.openId).toBe('wx-abc')
    expect(payload.iat).toBeTypeOf('number')
    expect(payload.exp).toBeTypeOf('number')
  })

  it('verifyToken throws on tampered token', async () => {
    const token = await generateToken({ sub: 'user-123', openId: 'wx-abc' })
    const tampered = token.slice(0, -5) + 'XXXXX'
    await expect(verifyToken(tampered)).rejects.toThrow()
  })
})
