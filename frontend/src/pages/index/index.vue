<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getUserInfo, clearSession } from '../../utils/auth.js'
import { logout } from '../../api/auth.js'

const userInfo = ref<{ nickname: string | null; avatar: string | null } | null>(null)
const showLogoutConfirm = ref(false)

onMounted(() => {
  const info = getUserInfo()
  userInfo.value = info
})

async function handleLogout() {
  try {
    await logout()
  } catch {
    // Server may be unreachable, clear local session anyway
  } finally {
    clearSession()
    uni.reLaunch({ url: '/pages/login/login' })
  }
}

function confirmLogout() {
  showLogoutConfirm.value = true
}

function goContacts() {
  uni.navigateTo({ url: '/pages/contacts/list' })
}
</script>

<template>
  <view class="home">
    <view v-if="userInfo" class="user-section">
      <view class="avatar">
        <text v-if="userInfo.nickname" class="avatar-text">
          {{ userInfo.nickname.charAt(0) }}
        </text>
        <text v-else class="avatar-text">👤</text>
      </view>
      <text class="nickname">
        {{ userInfo.nickname || '未设置昵称' }}
      </text>
    </view>

    <view class="welcome">
      <text class="title">欢迎使用常联系</text>
      <text class="subtitle">你的人脉管理助手</text>
    </view>

    <view class="nav-section">
      <view class="nav-card" @click="goContacts">
        <text class="nav-icon">📇</text>
        <text class="nav-label">联系人</text>
      </view>
    </view>

    <view class="action-section">
      <button class="action-btn" @click="confirmLogout">退出登录</button>
    </view>

    <!-- Logout confirmation dialog -->
    <view v-if="showLogoutConfirm" class="modal-overlay" @click="showLogoutConfirm = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">确认退出？</text>
        <text class="modal-body">退出后需要重新授权登录</text>
        <view class="modal-actions">
          <button class="modal-btn cancel" @click="showLogoutConfirm = false">取消操作</button>
          <button class="modal-btn confirm" @click="handleLogout">退出登录</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx;
  min-height: 100vh;
}

.user-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 64rpx;
}

.avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background-color: #f6f6f6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.avatar-text {
  font-size: 48rpx;
  color: #999;
}

.nickname {
  font-size: 32rpx;
  color: #333;
  font-weight: 600;
}

.welcome {
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

.nav-section {
  width: 100%;
  margin-bottom: 32rpx;
}

.nav-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  background-color: #fff;
  border-radius: 16rpx;
  border: 1px solid #eee;
}

.nav-icon {
  font-size: 48rpx;
  margin-bottom: 8rpx;
}

.nav-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
}

.action-section {
  width: 100%;
}

.action-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background-color: transparent;
  color: #e64340;
  font-size: 28rpx;
  border: 1px solid #eee;
  border-radius: 16rpx;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 48rpx;
  width: 80%;
  max-width: 600rpx;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  display: block;
  text-align: center;
  margin-bottom: 16rpx;
}

.modal-body {
  font-size: 28rpx;
  color: #999;
  display: block;
  text-align: center;
  margin-bottom: 32rpx;
}

.modal-actions {
  display: flex;
  gap: 16rpx;
}

.modal-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  border-radius: 12rpx;
  border: none;
}

.modal-btn.cancel {
  background-color: #f6f6f6;
  color: #666;
}

.modal-btn.confirm {
  background-color: #e64340;
  color: #fff;
}
</style>
