import { env } from '../config/env.js'

let cachedToken: string | null = null
let tokenExpiresAt: number = 0

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken
  }

  const url = new URL('https://api.weixin.qq.com/cgi-bin/token')
  url.searchParams.set('grant_type', 'client_credential')
  url.searchParams.set('appid', env.WECHAT_APP_ID)
  url.searchParams.set('secret', env.WECHAT_APP_SECRET)

  const response = await fetch(url.toString())
  const data = (await response.json()) as Record<string, unknown>

  if (data.errcode) {
    throw new Error(`WeChat getAccessToken failed: ${data.errcode} - ${data.errmsg}`)
  }

  const accessToken = data.access_token as string
  const expiresIn = (data.expires_in as number) || 7200

  cachedToken = accessToken
  tokenExpiresAt = Date.now() + (expiresIn - 300) * 1000 // refresh 5 min early

  return accessToken
}
