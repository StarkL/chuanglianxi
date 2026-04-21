import { describe, it, expect, beforeEach } from 'vitest'
import { request } from '../../src/utils/request.js'
import { storage } from './setup.js'

beforeEach(() => {
  ;(globalThis.uni as any).setStorageSync.mockClear()
  ;(globalThis.uni as any).getStorageSync.mockClear()
  ;(globalThis.uni as any).removeStorageSync.mockClear()
  ;(globalThis.uni as any).reLaunch.mockClear()
  ;(globalThis.uni as any).request.mockClear()
})

describe('request', () => {
  it('attaches Authorization header when token exists', async () => {
    storage.set('token', 'test-token')

    ;(globalThis.uni as any).request.mockImplementation(({ success }) => {
      success({ statusCode: 200, data: { success: true, data: 'ok' } })
    })

    await request({ url: '/test', method: 'GET' })

    expect(uni.request).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    )
  })

  it('does not attach Authorization header when no token', async () => {
    // No token in storage

    ;(globalThis.uni as any).request.mockImplementation(({ success }) => {
      success({ statusCode: 200, data: { success: true } })
    })

    await request({ url: '/test' })

    const callArgs = (uni.request as any).mock.calls[0][0]
    expect(callArgs.header.Authorization).toBeUndefined()
  })

  it('calls clearSessionAndRedirect on 401 response', async () => {
    storage.set('token', 'expired-token')

    ;(globalThis.uni as any).request.mockImplementation(({ success }) => {
      success({ statusCode: 401, data: { success: false, error: 'Unauthorized' } })
    })

    await expect(request({ url: '/test' })).rejects.toThrow('未登录')

    expect(uni.reLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/pages/login/login' })
    )
  })

  it('rejects on network failure', async () => {
    ;(globalThis.uni as any).request.mockImplementation(({ fail }) => {
      fail(new Error('Network Error'))
    })

    await expect(request({ url: '/test' })).rejects.toThrow('Network Error')
  })

  it('uses default method GET when not specified', async () => {
    ;(globalThis.uni as any).request.mockImplementation(({ success }) => {
      success({ statusCode: 200, data: { success: true } })
    })

    await request({ url: '/test' })

    expect(uni.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET' })
    )
  })
})
