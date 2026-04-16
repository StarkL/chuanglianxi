import { request } from '../utils/request.js'

export interface LoginParams {
  code: string
  nickname?: string
  avatar?: string
}

export interface LoginResult {
  token: string
  user: {
    id: string
    nickname: string | null
    avatar: string | null
    subscriptionTier: string
  }
}

export function login(params: LoginParams) {
  return request<LoginResult>({
    url: '/auth/wechat-login',
    method: 'POST',
    data: params
  })
}

export function verifyToken() {
  return request({
    url: '/auth/verify',
    method: 'GET'
  })
}

export function logout() {
  return request({
    url: '/auth/logout',
    method: 'POST'
  })
}
