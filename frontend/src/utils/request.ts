import { getToken } from './auth'

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
}

// H5: 用相对路径走 Vite proxy 代理
// 小程序: 必须用完整地址，否则 uni.request 无法发起请求
// #ifdef H5
const H5_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api'
// #endif

// #ifdef MP-WEIXIN
// 小程序开发：直接连接本地后端（不依赖 .env，避免被 H5 代理路径覆盖）
// 模拟器(platform=devtools)用 localhost；真机用线上/局域网地址（完整 base url）
function getMpBaseUrl(): string {
  try {
    const platform = uni.getSystemInfoSync().platform
    if (platform === 'devtools') return 'http://localhost:5000/api'
  } catch {
    // ignore
  }
  // 线上调试：在 .env.development 配置 VITE_MP_API_BASE（如 https://your-domain.com/api）
  const online = (import.meta as any).env?.VITE_MP_API_BASE
  if (online) return online
  // 未配置线上地址时回退到局域网 IP
  const mpHost = (import.meta as any).env?.VITE_MP_DEV_HOST || '192.168.3.84'
  return `http://${mpHost}:5000/api`
}
// #endif

function getBaseUrl(): string {
  // #ifdef H5
  return H5_BASE_URL
  // #endif
  // #ifdef MP-WEIXIN
  return getMpBaseUrl()
  // #endif
}

export function request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
  const token = getToken()

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${getBaseUrl()}${options.url}`,
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
