import { describe, it, expect, beforeEach } from 'vitest'
import { setToken, getToken, removeToken, setUserInfo, getUserInfo, clearSession } from '../../src/utils/auth.js'
import { storage } from './setup.js'

beforeEach(() => {
  ;(globalThis.uni as any).setStorageSync.mockClear()
  ;(globalThis.uni as any).getStorageSync.mockClear()
  ;(globalThis.uni as any).removeStorageSync.mockClear()
})

describe('setToken / getToken', () => {
  it('stores and retrieves a token', () => {
    setToken('test-token-123')
    expect(getToken()).toBe('test-token-123')
    expect(uni.setStorageSync).toHaveBeenCalledWith('token', 'test-token-123')
  })

  it('returns null when no token exists', () => {
    // storage is empty after beforeEach
    expect(getToken()).toBeNull()
  })
})

describe('removeToken', () => {
  it('clears both token and userInfo from storage', () => {
    removeToken()
    expect(uni.removeStorageSync).toHaveBeenCalledWith('token')
    expect(uni.removeStorageSync).toHaveBeenCalledWith('userInfo')
  })
})

describe('setUserInfo / getUserInfo', () => {
  it('stores and retrieves user info as JSON', () => {
    const info = { id: 'user-1', nickname: 'Test', avatar: '', subscriptionTier: 'free' }
    setUserInfo(info)
    const retrieved = getUserInfo()
    expect(retrieved).toEqual(info)
  })

  it('returns null when no user info exists', () => {
    // storage is empty after beforeEach
    expect(getUserInfo()).toBeNull()
  })

  it('returns null when stored data is invalid JSON', () => {
    storage.set('userInfo', 'not-json')
    expect(getUserInfo()).toBeNull()
  })
})

describe('clearSession', () => {
  it('calls removeToken', () => {
    clearSession()
    expect(uni.removeStorageSync).toHaveBeenCalledWith('token')
    expect(uni.removeStorageSync).toHaveBeenCalledWith('userInfo')
  })
})
