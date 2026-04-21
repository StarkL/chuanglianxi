import { vi } from 'vitest'

export const storage = new Map<string, string>()

const mockUni = {
  request: vi.fn(),
  getStorageSync: vi.fn((key: string) => storage.get(key) ?? ''),
  setStorageSync: vi.fn((key: string, value: unknown) => {
    storage.set(key, typeof value === 'string' ? value : JSON.stringify(value))
  }),
  removeStorageSync: vi.fn((key: string) => { storage.delete(key) }),
  reLaunch: vi.fn(),
}

globalThis.uni = mockUni as any

// Also expose as 'uni' for direct test usage
;(globalThis as any).uni = mockUni

beforeEach(() => {
  storage.clear()
})
