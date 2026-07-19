import { describe, it, expect } from 'vitest'
import { validateNickname } from './profile-validator'

describe('validateNickname', () => {
  it('accepts valid Chinese nickname', () => {
    const result = validateNickname('张三')
    expect(result.valid).toBe(true)
  })

  it('accepts nickname with letters and numbers', () => {
    expect(validateNickname('user123').valid).toBe(true)
    expect(validateNickname('Stark_9527').valid).toBe(true)
  })

  it('accepts nickname with allowed special chars ($ + _)', () => {
    expect(validateNickname('user$vip').valid).toBe(true)
    expect(validateNickname('pro_user+').valid).toBe(true)
    expect(validateNickname('$$_test_+').valid).toBe(true)
  })

  it('accepts 2-character minimum', () => {
    expect(validateNickname('AB').valid).toBe(true)
    expect(validateNickname('测试').valid).toBe(true)
  })

  it('accepts 20-character maximum', () => {
    expect(validateNickname('a'.repeat(20)).valid).toBe(true)
    expect(validateNickname('测'.repeat(20)).valid).toBe(true)
  })

  it('rejects empty string', () => {
    const result = validateNickname('')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('昵称不能为空')
  })

  it('rejects whitespace-only string', () => {
    const result = validateNickname('   ')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('昵称不能为空')
  })

  it('rejects single character', () => {
    const result = validateNickname('A')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('昵称长度为 2-20 个字符')
  })

  it('rejects 21+ characters', () => {
    const result = validateNickname('a'.repeat(21))
    expect(result.valid).toBe(false)
    expect(result.error).toBe('昵称长度为 2-20 个字符')
  })

  it('rejects disallowed special characters (@ # % & etc)', () => {
    const result = validateNickname('user@name')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('昵称只能包含中文、字母、数字和 $+_')
  })

  it('rejects emojis', () => {
    const result = validateNickname('user😀')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('昵称只能包含中文、字母、数字和 $+_')
  })

  it('rejects nicknames with spaces in the middle', () => {
    const result = validateNickname('user name')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('昵称只能包含中文、字母、数字和 $+_')
  })

  it('trims leading/trailing whitespace before validation', () => {
    expect(validateNickname('  张三  ').valid).toBe(true)
  })
})
