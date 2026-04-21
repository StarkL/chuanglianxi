import { vi } from 'vitest'

const storage = new Map<string, string>()

globalThis.uni = {
  request: vi.fn(),
  getStorageSync: vi.fn((key: string) => storage.get(key) ?? ''),
  setStorageSync: vi.fn((key: string, value: string) => { storage.set(key, value) }),
  removeStorageSync: vi.fn((key: string) => { storage.delete(key) }),
  reLaunch: vi.fn(),
} as any
