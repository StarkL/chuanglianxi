<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getUserInfo, setUserInfo } from '../../../utils/auth'
import { updateProfile } from '../../../api/auth'

const nickname = ref('')
const nicknameError = ref('')

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')

const saving = ref(false)
const showPasswordSection = ref(true)

const NICKNAME_REGEX = /^[一-龥a-zA-Z0-9$+_]+$/u

onMounted(() => {
  const info = getUserInfo()
  nickname.value = info?.nickname || ''
})

function validateNickname(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) {
    nicknameError.value = '昵称不能为空'
    return false
  }
  if (trimmed.length < 2 || trimmed.length > 20) {
    nicknameError.value = '昵称长度为 2-20 个字符'
    return false
  }
  if (!NICKNAME_REGEX.test(trimmed)) {
    nicknameError.value = '昵称只能包含中文、字母、数字和 $+_'
    return false
  }
  nicknameError.value = ''
  return true
}

function onNicknameInput() {
  validateNickname(nickname.value)
}

function onPasswordInput() {
  passwordError.value = ''
}

function validatePassword(): boolean {
  if (!oldPassword.value) {
    passwordError.value = '请输入原密码'
    return false
  }
  if (newPassword.value.length < 6) {
    passwordError.value = '新密码长度不能小于6位'
    return false
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = '两次输入的密码不一致'
    return false
  }
  if (oldPassword.value === newPassword.value) {
    passwordError.value = '新密码不能与原密码相同'
    return false
  }
  passwordError.value = ''
  return true
}

const canSave = computed(() => {
  return validateNickname(nickname.value) && !saving.value
})

async function handleSave() {
  if (!canSave.value) return
  saving.value = true

  const params: Record<string, string> = {
    nickname: nickname.value.trim()
  }

  if (oldPassword.value || newPassword.value || confirmPassword.value) {
    if (!validatePassword()) {
      saving.value = false
      return
    }
    params.oldPassword = oldPassword.value
    params.newPassword = newPassword.value
    params.confirmPassword = confirmPassword.value
  }

  try {
    const res = await updateProfile(params)
    if (res.success && res.data) {
      setUserInfo({ nickname: res.data.nickname, avatar: getUserInfo()?.avatar || null })
      uni.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 800)
    } else {
      uni.showToast({ title: res.error || '保存失败', icon: 'none' })
    }
  } catch (err: any) {
    uni.showToast({ title: err?.data?.error || '网络错误', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <view class="profile-edit">
    <!-- 基本信息 -->
    <view class="section-card">
      <text class="section-title">基本信息</text>

      <view class="field-group">
        <text class="field-label">昵称</text>
        <input
          class="field-input"
          v-model="nickname"
          placeholder="请输入昵称"
          @input="onNicknameInput"
        />
      </view>

      <text v-if="nicknameError" class="field-error">{{ nicknameError }}</text>
    </view>

    <!-- 安全设置 -->
    <view class="section-card">
      <text class="section-title">安全设置</text>

      <view class="field-group">
        <text class="field-label">原密码</text>
        <input
          class="field-input"
          type="password"
          v-model="oldPassword"
          placeholder="请输入原密码"
          @input="onPasswordInput"
        />
      </view>

      <view class="field-group">
        <text class="field-label">新密码</text>
        <input
          class="field-input"
          type="password"
          v-model="newPassword"
          placeholder="请输入新密码（至少6位）"
          @input="onPasswordInput"
        />
      </view>

      <view class="field-group">
        <text class="field-label">确认密码</text>
        <input
          class="field-input"
          type="password"
          v-model="confirmPassword"
          placeholder="请再次输入新密码"
          @input="onPasswordInput"
        />
      </view>

      <text v-if="passwordError" class="field-error">{{ passwordError }}</text>
    </view>

    <!-- 保存按钮 -->
    <view class="save-area">
      <button
        class="save-btn"
        :class="{ disabled: !canSave }"
        :loading="saving"
        :disabled="!canSave"
        @click="handleSave"
      >
        保存
      </button>
    </view>
  </view>
</template>

<style scoped>
.profile-edit {
  min-height: 100%;
  box-sizing: border-box;
  background-color: #F8F9FA;
  padding: 32rpx;
}

.section-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #2D3436;
  margin-bottom: 28rpx;
}

.field-group {
  margin-bottom: 24rpx;
}

.field-label {
  display: block;
  font-size: 26rpx;
  color: #636E72;
  margin-bottom: 12rpx;
}

.field-input {
  width: 100%;
  height: 80rpx;
  background: #F8FAFC;
  border: 2rpx solid #E2E8F0;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #1E293B;
  box-sizing: border-box;
}

.field-input:focus {
  border-color: #6C5CE7;
  background: #FFFFFF;
}

.field-error {
  display: block;
  font-size: 24rpx;
  color: #EF4444;
  margin-top: -12rpx;
  margin-bottom: 16rpx;
}

.save-area {
  margin-top: 16rpx;
}

.save-btn {
  width: 100%;
  height: 92rpx;
  background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 28rpx;
  border: none;
  box-shadow: 0 10rpx 30rpx rgba(108, 92, 231, 0.25);
}

.save-btn.disabled {
  background: #CBD5E1;
  color: #94A3B8;
  box-shadow: none;
  pointer-events: none;
}

.save-btn::after {
  border: none;
}
</style>
