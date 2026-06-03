import { request } from '../utils/request'

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

export interface PasswordLoginParams {
  username: string
  password?: string
}

export interface RegisterParams {
  username: string
  password?: string
  nickname?: string
  avatar?: string
}

export function passwordLogin(params: PasswordLoginParams) {
  return request<LoginResult>({
    url: '/auth/login',
    method: 'POST',
    data: params
  })
}

export function register(params: RegisterParams) {
  return request<LoginResult>({
    url: '/auth/register',
    method: 'POST',
    data: params
  })
}

