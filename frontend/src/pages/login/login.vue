<script setup lang="ts">
import { ref } from 'vue'
import { setToken, setUserInfo } from '../../utils/auth'
import { login, passwordLogin, register as registerApi } from '../../api/auth'

const loading = ref(false)
const error = ref('')
const agreedToPolicies = ref(false)

// H5 Form data
const activeTab = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const nickname = ref('')
const showPassword = ref(false)

function navigateToPrivacy() {
  uni.navigateTo({ url: '/pages/privacy/privacy' })
}

function navigateToAgreement() {
  uni.navigateTo({ url: '/pages/agreement/agreement' })
}

function toggleTab(tab: 'login' | 'register') {
  activeTab.value = tab
  error.value = ''
}

// #ifdef H5
async function handleH5Submit() {
  if (loading.value || !agreedToPolicies.value) return
  
  if (!username.value || username.value.trim().length < 3) {
    error.value = '用户名长度不能小于3位'
    return
  }
  if (!password.value || password.value.length < 6) {
    error.value = '密码长度不能小于6位'
    return
  }

  loading.value = true
  error.value = ''

  try {
    let res
    if (activeTab.value === 'login') {
      res = await passwordLogin({
        username: username.value.trim(),
        password: password.value
      })
    } else {
      res = await registerApi({
        username: username.value.trim(),
        password: password.value,
        nickname: nickname.value.trim() || username.value.trim()
      })
    }

    if (res.success && res.data) {
      setToken(res.data.token)
      setUserInfo(res.data.user)
      uni.switchTab({ url: '/pages/contacts/list' })
    } else {
      error.value = res.error || '操作失败，请重试'
    }
  } catch (err: any) {
    error.value = err.data?.error || '网络连接失败，请稍后重试'
  } finally {
    loading.value = false
  }
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

    <!-- H5 账号密码登录 / 注册区域 -->
    <!-- #ifdef H5 -->
    <view class="auth-container">
      <view class="tabs-header">
        <view 
          class="tab-item" 
          :class="{ active: activeTab === 'login' }" 
          @click="toggleTab('login')"
        >
          账号登录
          <view class="active-indicator" v-if="activeTab === 'login'"></view>
        </view>
        <view 
          class="tab-item" 
          :class="{ active: activeTab === 'register' }" 
          @click="toggleTab('register')"
        >
          用户注册
          <view class="active-indicator" v-if="activeTab === 'register'"></view>
        </view>
      </view>

      <view class="form-body">
        <view class="input-wrapper">
          <text class="input-icon">👤</text>
          <input 
            type="text" 
            class="form-input" 
            v-model="username" 
            placeholder="请输入用户名 (至少3位)" 
            placeholder-class="placeholder-style"
          />
        </view>

        <view v-if="activeTab === 'register'" class="input-wrapper">
          <text class="input-icon">✍️</text>
          <input 
            type="text" 
            class="form-input" 
            v-model="nickname" 
            placeholder="请输入昵称 (选填)" 
            placeholder-class="placeholder-style"
          />
        </view>

        <view class="input-wrapper">
          <text class="input-icon">🔒</text>
          <input 
            :password="!showPassword" 
            class="form-input" 
            v-model="password" 
            placeholder="请输入密码 (至少6位)" 
            placeholder-class="placeholder-style"
          />
          <view class="eye-icon" @click="showPassword = !showPassword">
            <text class="eye-emoji">{{ showPassword ? '👁️' : '🙈' }}</text>
          </view>
        </view>

        <button 
          class="login-btn" 
          :class="{ disabled: !agreedToPolicies || !username || !password }" 
          :loading="loading" 
          :disabled="loading || !agreedToPolicies" 
          @click="handleH5Submit"
        >
          <text class="btn-text">{{ activeTab === 'login' ? '立即登录' : '提交注册' }}</text>
        </button>
      </view>
    </view>
    <!-- #endif -->

    <!-- 微信小程序授权登录区域 -->
    <!-- #ifdef MP-WEIXIN -->
    <view class="welcome-section">
      <text class="welcome-title">欢迎回来</text>
      <text class="welcome-subtitle">使用微信账号登录，开启你的人脉管理之旅</text>
    </view>

    <view class="login-section">
      <button class="login-btn" :class="{ disabled: !agreedToPolicies }" :loading="loading" :disabled="loading || !agreedToPolicies" @click="handleLogin">
        <text class="btn-text">微信登录</text>
      </button>
    </view>
    <!-- #endif -->

    <!-- 错误提示 -->
    <view v-if="error" class="error-card animate-shake">
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
  padding: 100rpx 48rpx 64rpx;
  box-sizing: border-box;
}

/* ---- Logo 区域 ---- */
.logo-card {
  margin-bottom: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.logo-icon {
  width: 140rpx;
  height: 140rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20rpx 50rpx rgba(108, 92, 231, 0.25);
}

.logo-emoji {
  font-size: 64rpx;
}

.logo-text {
  font-size: 44rpx;
  font-weight: 700;
  color: #2D3436;
  letter-spacing: 4rpx;
}

.logo-slogan {
  font-size: 24rpx;
  color: #636E72;
  margin-top: -6rpx;
}

/* ---- H5 账号密码容器 ---- */
.auth-container {
  width: 100%;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 36rpx;
  box-shadow: 0 16rpx 48rpx rgba(108, 92, 231, 0.08);
  border: 1rpx solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10rpx);
  padding: 40rpx;
  box-sizing: border-box;
  margin-bottom: 40rpx;
}

.tabs-header {
  display: flex;
  justify-content: space-around;
  border-bottom: 1rpx solid #E2E8F0;
  margin-bottom: 40rpx;
  padding-bottom: 10rpx;
}

.tab-item {
  font-size: 30rpx;
  color: #64748B;
  font-weight: 500;
  padding: 16rpx 0;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-item.active {
  color: #6C5CE7;
  font-weight: 700;
}

.active-indicator {
  position: absolute;
  bottom: 0;
  left: 10%;
  width: 80%;
  height: 6rpx;
  background: linear-gradient(90deg, #6C5CE7, #A29BFE);
  border-radius: 3rpx;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #F8FAFC;
  border: 2rpx solid #E2E8F0;
  border-radius: 24rpx;
  padding: 0 28rpx;
  height: 90rpx;
  transition: all 0.3s ease;
}

.input-wrapper:focus-within {
  border-color: #6C5CE7;
  background: #FFFFFF;
  box-shadow: 0 0 16rpx rgba(108, 92, 231, 0.08);
}

.input-icon {
  font-size: 34rpx;
  margin-right: 18rpx;
}

.form-input {
  flex: 1;
  height: 100%;
  font-size: 28rpx;
  color: #1E293B;
  background: transparent;
  border: none;
}

.placeholder-style {
  color: #94A3B8;
  font-size: 28rpx;
}

.eye-icon {
  padding: 10rpx;
  cursor: pointer;
}

.eye-emoji {
  font-size: 34rpx;
}

/* ---- 微信小程序登录文字与区域 ---- */
.welcome-section {
  text-align: center;
  margin-bottom: 60rpx;
}

.welcome-title {
  display: block;
  font-size: 38rpx;
  font-weight: 700;
  color: #2D3436;
  margin-bottom: 14rpx;
}

.welcome-subtitle {
  font-size: 26rpx;
  color: #636E72;
  line-height: 1.6;
}

.login-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;
}

/* ---- 提交登录按钮 ---- */
.login-btn {
  width: 100%;
  height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 28rpx;
  border: none;
  box-shadow: 0 10rpx 30rpx rgba(108, 92, 231, 0.25);
  margin-top: 10rpx;
  transition: all 0.3s ease;
}

.login-btn:active {
  transform: scale(0.98);
  opacity: 0.9;
}

.login-btn.disabled {
  background: #CBD5E1;
  color: #94A3B8;
  box-shadow: none;
  pointer-events: none;
}

.login-btn::after {
  border: none;
}

.btn-text {
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 600;
}

/* ---- 错误提示 ---- */
.error-card {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: rgba(239, 68, 68, 0.05);
  border: 1rpx solid rgba(239, 68, 68, 0.15);
  border-radius: 20rpx;
  padding: 18rpx 24rpx;
  margin-bottom: 30rpx;
  width: 100%;
  box-sizing: border-box;
}

.error-icon {
  font-size: 26rpx;
}

.error-text {
  font-size: 25rpx;
  color: #EF4444;
}

.animate-shake {
  animation: shake 0.4s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8rpx); }
  75% { transform: translateX(8rpx); }
}

/* ---- 隐私协议 ---- */
.privacy-section {
  margin-top: 10rpx;
  width: 100%;
}

.checkbox-row {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 16rpx;
}

.checkbox {
  width: 32rpx;
  height: 32rpx;
  min-width: 32rpx;
  border: 2rpx solid #CBD5E1;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4rpx;
  transition: all 0.2s;
  cursor: pointer;
}

.checkbox.checked {
  background: linear-gradient(135deg, #6C5CE7, #A29BFE);
  border-color: #6C5CE7;
  box-shadow: 0 4rpx 10rpx rgba(108, 92, 231, 0.2);
}

.check-icon {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 700;
}

.privacy-text {
  font-size: 24rpx;
  color: #64748B;
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
  color: #94A3B8;
  margin-top: auto;
  padding-top: 40rpx;
  text-align: center;
}
</style>
