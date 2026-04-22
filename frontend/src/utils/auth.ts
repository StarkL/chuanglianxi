const TOKEN_KEY = 'token'
const USER_KEY = 'userInfo'

interface UserInfo {
  id: string
  nickname: string | null
  avatar: string | null
}

export function setToken(token: string): void {
  uni.setStorageSync(TOKEN_KEY, token)
}

export function getToken(): string | null {
  return uni.getStorageSync(TOKEN_KEY) || null
}

export function removeToken(): void {
  uni.removeStorageSync(TOKEN_KEY)
  uni.removeStorageSync(USER_KEY)
}

export function setUserInfo(info: UserInfo): void {
  uni.setStorageSync(USER_KEY, info)
}

export function getUserInfo(): UserInfo | null {
  try {
    const info = uni.getStorageSync(USER_KEY)
    if (!info) return null
    // In H5 mode, getStorageSync returns the object directly (not JSON string)
    // In mock mode (tests), it returns a JSON string
    return typeof info === 'string' ? (JSON.parse(info) as UserInfo) : info
  } catch {
    return null
  }
}

export function clearSession(): void {
  removeToken()
}
