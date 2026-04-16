import { env } from '../config/env.js'

interface Code2SessionResult {
  openId: string
  sessionKey: string
  unionId?: string
}

export async function code2Session(code: string): Promise<Code2SessionResult> {
  const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
  url.searchParams.set('appid', env.WECHAT_APP_ID)
  url.searchParams.set('secret', env.WECHAT_APP_SECRET)
  url.searchParams.set('js_code', code)
  url.searchParams.set('grant_type', 'authorization_code')

  const response = await fetch(url.toString())
  const data = (await response.json()) as Record<string, unknown>

  if (data.errcode) {
    throw new Error(`WeChat code2Session failed: ${data.errcode} - ${data.errmsg}`)
  }

  return {
    openId: data.openid as string,
    sessionKey: data.session_key as string,
    unionId: data.unionid as string | undefined,
  }
}
