<script setup lang="ts">
import { ref, computed } from 'vue'
import { updateProfile } from '../../../api/auth'

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const saving = ref(false)

const canSave = computed(() => {
  return oldPassword.value && newPassword.value && confirmPassword.value && !saving.value
})

function clearError() {
  error.value = ''
}

async function handleChange() {
  if (!canSave.value) return

  if (newPassword.value.length < 6) {
    error.value = '新密码长度不能小于6位'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  if (oldPassword.value === newPassword.value) {
    error.value = '新密码不能与原密码相同'
    return
  }

  saving.value = true
  error.value = ''

  try {
    const res = await updateProfile({
      oldPassword: oldPassword.value,
      newPassword: newPassword.value,
      confirmPassword: confirmPassword.value,
    })
    if (res.success) {
      uni.showToast({ title: '密码修改成功', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 800)
    } else {
      error.value = res.error || '修改失败'
    }
  } catch (err: any) {
    error.value = err?.data?.error || '网络错误'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <view class="password-change">
    <view class="section-card">
      <text class="section-title">修改密码</text>

      <view class="field-group">
        <text class="field-label">原密码</text>
        <input
          class="field-input"
          type="password"
          v-model="oldPassword"
          placeholder="请输入原密码"
          @input="clearError"
        />
      </view>

      <view class="field-group">
        <text class="field-label">新密码</text>
        <input
          class="field-input"
          type="password"
          v-model="newPassword"
          placeholder="请输入新密码（至少6位）"
          @input="clearError"
        />
      </view>

      <view class="field-group">
        <text class="field-label">确认新密码</text>
        <input
          class="field-input"
          type="password"
          v-model="confirmPassword"
          placeholder="请再次输入新密码"
          @input="clearError"
        />
      </view>

      <text v-if="error" class="field-error">{{ error }}</text>
    </view>

    <view class="save-area">
      <button
        class="save-btn"
        :class="{ disabled: !canSave }"
        :loading="saving"
        :disabled="!canSave"
        @click="handleChange"
      >
        确认修改
      </button>
    </view>
  </view>
</template>

<style scoped>
.password-change {
  min-height: 100%;
  box-sizing: border-box;
  background-color: #F8F9FA;
  padding: 32rpx;
}

.section-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
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

.field-error {
  display: block;
  font-size: 24rpx;
  color: #EF4444;
  margin-top: -12rpx;
  margin-bottom: 16rpx;
}

.save-area {
  margin-top: 32rpx;
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
