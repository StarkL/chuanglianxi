<script setup lang="ts">
import { ref } from 'vue'
import { setToken, setUserInfo } from '../../utils/auth.js'
import { login } from '../../api/auth.js'

const loading = ref(false)
const error = ref('')

// #ifdef H5
async function handleH5MockLogin() {
  if (loading.value) return
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
  if (loading.value) return
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
      uni.switchTab({ url: '/pages/index/index' })
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
    <view class="logo-section">
      <view class="logo-text">常联系</view>
    </view>

    <view class="welcome-section">
      <text class="title">欢迎使用常联系</text>
      <text class="subtitle">使用微信账号登录，开启你的人脉管理之旅</text>
    </view>

    <view class="login-section">
      <!-- #ifdef H5 -->
      <button class="login-btn" :loading="loading" :disabled="loading" @click="handleH5MockLogin">
        模拟登录 (H5开发)
      </button>
      <!-- #endif -->

      <!-- #ifdef MP-WEIXIN -->
      <button
        class="login-btn"
        :loading="loading"
        :disabled="loading"
        @click="handleLogin"
      >
        微信登录
      </button>
      <!-- #endif -->

      <text class="login-hint">登录后即可开始管理你的人脉</text>
    </view>

    <view v-if="error" class="error-section">
      <text class="error-text">{{ error }}</text>
    </view>

    <view class="privacy-section">
      <text class="privacy-text">
        登录即表示同意<text class="link">用户协议</text>和<text class="link">隐私政策</text>
      </text>
    </view>
  </view>
</template>

<style scoped>
.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background-color: #ffffff;
  padding: 128rpx 64rpx 64rpx;
}

.logo-section {
  margin-bottom: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 240rpx;
  height: 240rpx;
  background-color: #07c160;
  border-radius: 48rpx;
}

.logo-text {
  font-size: 48rpx;
  font-weight: 600;
  color: #ffffff;
}

.welcome-section {
  text-align: center;
  margin-bottom: 96rpx;
}

.title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.subtitle {
  font-size: 28rpx;
  color: #999;
}

.login-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 64rpx;
}

.login-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background-color: #07c160;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 16rpx;
  border: none;
}

.login-btn[disabled] {
  opacity: 0.7;
}

.login-hint {
  font-size: 24rpx;
  color: #999;
  margin-top: 16rpx;
}

.error-section {
  margin-bottom: 32rpx;
  padding: 16rpx 32rpx;
  background-color: #fff2f0;
  border-radius: 8rpx;
}

.error-text {
  font-size: 28rpx;
  color: #e64340;
}

.privacy-section {
  text-align: center;
}

.privacy-text {
  font-size: 24rpx;
  color: #999;
}

.link {
  color: #07c160;
}
</style>
