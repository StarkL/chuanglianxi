import { getToken } from './auth.js'

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, unknown>
}

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export function request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
  const token = getToken()

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success: (res) => {
        const data = res.data as ApiResponse<T>
        if (res.statusCode === 401) {
          clearSessionAndRedirect()
          reject(new Error('未登录'))
          return
        }
        resolve(data)
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

function clearSessionAndRedirect(): void {
  uni.removeStorageSync('token')
  uni.removeStorageSync('userInfo')
  uni.reLaunch({ url: '/pages/login/login' })
}
