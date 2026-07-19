import { describe, it, expect } from 'vitest'
import { validatePasswordChange } from './profile-validator'

describe('validatePasswordChange', () => {
  it('accepts valid password change input', () => {
    const result = validatePasswordChange('oldPass123', 'newPass456', 'newPass456')
    expect(result.valid).toBe(true)
  })

  it('rejects empty old password', () => {
    const result = validatePasswordChange('', 'newPass456', 'newPass456')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('请输入原密码')
  })

  it('rejects new password shorter than 6 characters', () => {
    const result = validatePasswordChange('oldPass123', '12345', '12345')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('新密码长度不能小于6位')
  })

  it('rejects mismatched confirm password', () => {
    const result = validatePasswordChange('oldPass123', 'newPass456', 'newPass789')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('两次输入的密码不一致')
  })

  it('rejects new password same as old password', () => {
    const result = validatePasswordChange('samePass', 'samePass', 'samePass')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('新密码不能与原密码相同')
  })

  it('accepts exactly 6 character new password', () => {
    const result = validatePasswordChange('oldPass1', '123456', '123456')
    expect(result.valid).toBe(true)
  })
})
