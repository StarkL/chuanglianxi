<script setup lang="ts">
import { ref } from 'vue'
import { setToken, setUserInfo } from '../../utils/auth'
import { login } from '../../api/auth'

const loading = ref(false)
const error = ref('')
const agreedToPolicies = ref(false)

function navigateToPrivacy() {
  uni.navigateTo({ url: '/pages/privacy/privacy' })
}

function navigateToAgreement() {
  uni.navigateTo({ url: '/pages/agreement/agreement' })
}

// #ifdef H5
async function handleH5MockLogin() {
  if (loading.value || !agreedToPolicies.value) return
  loading.value = true
  error.value = ''
  setToken('dev-token-h5')
  setUserInfo({ id: 'dev-user', nickname: 'H5测试用户', avatar: '' })
  uni.switchTab({ url: '/pages/contacts/list' })
  loading.value = false
}
// #endif

// #ifdef MP-WEIXIN
async function handleLogin() {
  if (loading.value || !agreedToPolicies.value) return
  loading.value = true
  error.value = ''

  try {
    const loginResult = await new Promise<UniApp.LoginRes>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: resolve,
        fail: reject,
      })
    })

    if (!loginResult.code) {
      error.value = '微信授权失败'
      return
    }

    const res = await login({ code: loginResult.code })

    if (res.success && res.data) {
      setToken(res.data.token)
      setUserInfo(res.data.user)
      uni.switchTab({ url: '/pages/contacts/list' })
    } else {
      error.value = res.error || '登录失败，请重试'
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('cancel') || message.includes('fail')) {
      error.value = '登录已取消'
    } else if (message.includes('network') || message.includes('request')) {
      error.value = '网络连接失败'
    } else {
      error.value = '服务暂时不可用'
    }
  } finally {
    loading.value = false
  }
}
// #endif
</script>

<template>
  <view class="login-page">
    <!-- Logo 区域 -->
    <view class="logo-card">
      <view class="logo-inner">
        <view class="logo-icon">
          <text class="logo-emoji">💬</text>
        </view>
        <text class="logo-text">常联系</text>
        <text class="logo-slogan">温暖你的人脉圈</text>
      </view>
    </view>

    <!-- 欢迎文字 -->
    <view class="welcome-section">
      <text class="welcome-title">欢迎回来</text>
      <text class="welcome-subtitle">使用微信账号登录，开启你的人脉管理之旅</text>
    </view>

    <!-- 登录按钮 -->
    <view class="login-section">
      <!-- #ifdef H5 -->
      <button class="login-btn" :class="{ disabled: !agreedToPolicies }" :loading="loading" :disabled="loading || !agreedToPolicies" @click="handleH5MockLogin">
        <text class="btn-text">模拟登录 (H5开发)</text>
      </button>
      <!-- #endif -->

      <!-- #ifdef MP-WEIXIN -->
      <button class="login-btn" :class="{ disabled: !agreedToPolicies }" :loading="loading" :disabled="loading || !agreedToPolicies" @click="handleLogin">
        <text class="btn-text">微信登录</text>
      </button>
      <!-- #endif -->
    </view>

    <!-- 错误提示 -->
    <view v-if="error" class="error-card">
      <text class="error-icon">⚠️</text>
      <text class="error-text">{{ error }}</text>
    </view>

    <!-- 隐私协议 -->
    <view class="privacy-section">
      <view class="checkbox-row" @click="agreedToPolicies = !agreedToPolicies">
        <view class="checkbox" :class="{ checked: agreedToPolicies }">
          <text v-if="agreedToPolicies" class="check-icon">✓</text>
        </view>
        <text class="privacy-text">
          我已阅读并同意<text class="link" @click.stop="navigateToAgreement">《用户协议》</text>和<text class="link" @click.stop="navigateToPrivacy">《隐私政策》</text>
        </text>
      </view>
    </view>

    <!-- 底部提示 -->
    <text class="footer-text">登录后即可开始管理你的人脉</text>
  </view>
</template>

<style scoped>
.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(180deg, #F0EEFF 0%, #F8F9FA 30%);
  padding: 120rpx 48rpx 64rpx;
}

/* ---- Logo 区域 ---- */
.logo-card {
  margin-bottom: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.logo-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 24rpx 64rpx rgba(108, 92, 231, 0.3);
}

.logo-emoji {
  font-size: 72rpx;
}

.logo-text {
  font-size: 48rpx;
  font-weight: 700;
  color: #2D3436;
  letter-spacing: 4rpx;
}

.logo-slogan {
  font-size: 26rpx;
  color: #636E72;
  margin-top: -8rpx;
}

/* ---- 欢迎文字 ---- */
.welcome-section {
  text-align: center;
  margin-bottom: 80rpx;
}

.welcome-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #2D3436;
  margin-bottom: 16rpx;
}

.welcome-subtitle {
  font-size: 28rpx;
  color: #636E72;
  line-height: 1.6;
}

/* ---- 登录按钮 ---- */
.login-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 48rpx;
}

.login-btn {
  width: 100%;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 32rpx;
  border: none;
  box-shadow: 0 12rpx 40rpx rgba(108, 92, 231, 0.3);
}

.login-btn.disabled {
  background: #B2BEC3;
  box-shadow: none;
}

.login-btn::after {
  border: none;
}

.btn-text {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: 600;
}

/* ---- 错误提示 ---- */
.error-card {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: rgba(224, 49, 49, 0.06);
  border: 1rpx solid rgba(224, 49, 49, 0.15);
  border-radius: 16rpx;
  padding: 20rpx 28rpx;
  margin-bottom: 32rpx;
  width: 100%;
}

.error-icon {
  font-size: 28rpx;
}

.error-text {
  font-size: 26rpx;
  color: #E03131;
}

/* ---- 隐私协议 ---- */
.privacy-section {
  margin-top: 16rpx;
}

.checkbox-row {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 16rpx;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  min-width: 36rpx;
  border: 3rpx solid #D2D2D2;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4rpx;
  transition: all 0.2s;
}

.checkbox.checked {
  background: linear-gradient(135deg, #6C5CE7, #A29BFE);
  border-color: #6C5CE7;
  box-shadow: 0 4rpx 12rpx rgba(108, 92, 231, 0.25);
}

.check-icon {
  font-size: 24rpx;
  color: #fff;
  font-weight: 700;
}

.privacy-text {
  font-size: 24rpx;
  color: #636E72;
  line-height: 1.8;
  flex: 1;
}

.link {
  color: #6C5CE7;
  font-weight: 500;
}

/* ---- 底部提示 ---- */
.footer-text {
  font-size: 22rpx;
  color: #B2BEC3;
  margin-top: 48rpx;
  text-align: center;
}
</style>
