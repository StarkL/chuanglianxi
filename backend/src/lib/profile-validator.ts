/**
 * 用户资料校验规则
 *
 * 前端实时校验 + 后端兜底校验共用同一套规则，
 * 确保绕过前端也能被拦截。
 */

export interface ValidationResult {
  valid: boolean
  error?: string
}

const NICKNAME_REGEX = /^[一-龥a-zA-Z0-9$+_]+$/u

/**
 * 校验昵称：2-20 字符，允许中文/字母/数字/$+_
 */
export function validateNickname(raw: string): ValidationResult {
  const nickname = raw.trim()

  if (!nickname) {
    return { valid: false, error: '昵称不能为空' }
  }

  if (nickname.length < 2 || nickname.length > 20) {
    return { valid: false, error: '昵称长度为 2-20 个字符' }
  }

  if (!NICKNAME_REGEX.test(nickname)) {
    return { valid: false, error: '昵称只能包含中文、字母、数字和 $+_' }
  }

  return { valid: true }
}

export interface PasswordChangeInput {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

/**
 * 校验修改密码的输入：旧密码非空、新密码 ≥ 6 位、两次一致、不与旧密码相同
 */
export function validatePasswordChange(
  oldPassword: string,
  newPassword: string,
  confirmPassword: string
): ValidationResult {
  if (!oldPassword) {
    return { valid: false, error: '请输入原密码' }
  }

  if (newPassword.length < 6) {
    return { valid: false, error: '新密码长度不能小于6位' }
  }

  if (newPassword !== confirmPassword) {
    return { valid: false, error: '两次输入的密码不一致' }
  }

  if (oldPassword === newPassword) {
    return { valid: false, error: '新密码不能与原密码相同' }
  }

  return { valid: true }
}
