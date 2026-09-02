import { getToken } from '../utils/auth'

export interface ScanResult {
  success: boolean
  data?: {
    cardId: string
    ocr: {
      name: string
      company: string
      title: string
      phone: string
      email: string
      website: string | null
      address: string | null
      wechatId: string | null
    }
  }
  error?: string
}

export function scanBusinessCard(imagePath: string): Promise<ScanResult> {
  return new Promise((resolve, reject) => {
    const token = getToken()
    if (!token) {
      reject(new Error('未登录'))
      return
    }

    const { protocol, host } = getServerInfo()
    const url = `${protocol}://${host}/ocr/business-card`

    uni.uploadFile({
      url,
      filePath: imagePath,
      name: 'image',
      header: {
        Authorization: `Bearer ${token}`
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data) as ScanResult
          resolve(data)
        } catch {
          reject(new Error('解析响应失败'))
        }
      },
      fail: (err) => reject(err)
    })
  })
}

function getServerInfo(): { protocol: string; host: string } {
  // #ifdef H5
  // H5 uses Vite proxy, so relative path is fine. Use localhost as fallback.
  return { protocol: 'http', host: 'localhost:5000' }
  // #endif
  // #ifdef MP-WEIXIN
  // Mini program needs full URL to backend
  const url = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api'
  try {
    const parsed = new URL(url)
    const host = parsed.port ? parsed.host : `${parsed.hostname}:5000`
    return { protocol: parsed.protocol.replace(':', ''), host }
  } catch {
    return { protocol: 'http', host: 'localhost:5000' }
  }
  // #endif
}
