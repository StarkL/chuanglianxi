const TOKEN_KEY = 'token'
const USER_KEY = 'userInfo'

interface UserInfo {
  id: string
  nickname: string | null
  avatar: string | null
  subscriptionTier: string
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
    return info ? (JSON.parse(info) as UserInfo) : null
  } catch {
    return null
  }
}

export function clearSession(): void {
  removeToken()
}
