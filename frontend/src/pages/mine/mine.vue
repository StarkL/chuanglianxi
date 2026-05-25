<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getUserInfo } from '../../utils/auth'

const userInfo = ref<{ nickname: string | null; avatar: string | null } | null>(null)
const version = 'v0.1.0'

onMounted(() => {
  const info = getUserInfo()
  userInfo.value = info
})

function goPrivacy() {
  uni.navigateTo({ url: '/pages/privacy/privacy' })
}

function goAgreement() {
  uni.navigateTo({ url: '/pages/agreement/agreement' })
}

function goScan() {
  uni.navigateTo({ url: '/pages/ocr/scan/scan' })
}

function goCards() {
  uni.navigateTo({ url: '/pages/ocr/cards/cards' })
}

async function handleLogout() {
  try {
    const { logout } = await import('../../api/auth')
    await logout()
  } catch {
    // Server may be unreachable, clear local session anyway
  } finally {
    const { clearSession } = await import('../../utils/auth')
    clearSession()
    uni.reLaunch({ url: '/pages/login/login' })
  }
}

function confirmLogout() {
  uni.showModal({
    title: '确认退出？',
    content: '退出后需要重新授权登录',
    confirmColor: '#e03131',
    success: (res) => {
      if (res.confirm) {
        handleLogout()
      }
    },
  })
}
</script>

<template>
  <view class="mine">
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="user-avatar">
        <text v-if="userInfo?.avatar" class="avatar-img">{{ userInfo.avatar }}</text>
        <text v-else class="avatar-placeholder">{{ (userInfo?.nickname || 'U').charAt(0).toUpperCase() }}</text>
      </view>
      <view class="user-info">
        <text class="user-name">{{ userInfo?.nickname || '常联系用户' }}</text>
        <text class="user-role">你的人脉管理助手</text>
      </view>
      <view class="card-decoration" />
    </view>

    <!-- 快捷操作 -->
    <view class="quick-actions">
      <view class="action-item" @click="goScan">
        <view class="action-icon scan-icon">
          <wd-icon name="scan" size="24px" color="#FFFFFF" />
        </view>
        <text class="action-label">扫描名片</text>
      </view>
      <view class="action-item" @click="goCards">
        <view class="action-icon star-icon">
          <wd-icon name="star" size="24px" color="#FFFFFF" />
        </view>
        <text class="action-label">名片墙</text>
      </view>
    </view>

    <!-- 设置分组 -->
    <view class="settings-card">
      <view class="settings-item" @click="goPrivacy">
        <view class="settings-icon-wrap privacy-icon">
          <wd-icon name="lock-on" size="18px" />
        </view>
        <text class="settings-label">隐私政策</text>
        <text class="settings-arrow">›</text>
      </view>
      <view class="settings-item" @click="goAgreement">
        <view class="settings-icon-wrap agreement-icon">
          <wd-icon name="check-circle" size="18px" />
        </view>
        <text class="settings-label">用户协议</text>
        <text class="settings-arrow">›</text>
      </view>
      <view class="settings-item">
        <view class="settings-icon-wrap about-icon">
          <wd-icon name="info-circle" size="18px" />
        </view>
        <text class="settings-label">关于常联系</text>
        <text class="settings-value">{{ version }}</text>
      </view>
    </view>

    <!-- 退出按钮 -->
    <view class="logout-area">
      <button class="logout-btn" @click="confirmLogout">退出登录</button>
    </view>
  </view>
</template>

<style scoped>
.mine {
  min-height: 100vh;
  background-color: #F8F9FA;
  padding: 0;
}

/* ---- 用户信息卡片 ---- */
.user-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 60%, #74B9FF 100%);
  padding: 80rpx 40rpx 48rpx;
  display: flex;
  align-items: center;
  gap: 28rpx;
}

.card-decoration {
  position: absolute;
  right: -40rpx;
  top: -40rpx;
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}

.avatar-img {
  font-size: 60rpx;
}

.avatar-placeholder {
  font-size: 48rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  z-index: 1;
}

.user-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.user-role {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.75);
}

/* ---- 快捷操作 ---- */
.quick-actions {
  display: flex;
  gap: 20rpx;
  padding: 32rpx;
  margin-top: -24rpx;
  position: relative;
  z-index: 2;
}

.action-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx 16rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
}

.action-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scan-icon {
  background: linear-gradient(135deg, #6C5CE7, #A29BFE);
}

.star-icon {
  background: linear-gradient(135deg, #FD79A8, #FDCB6E);
}

.action-label {
  font-size: 26rpx;
  font-weight: 500;
  color: #2D3436;
}

/* ---- 设置分组 ---- */
.settings-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  margin: 0 32rpx 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
  overflow: hidden;
}

.settings-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #F0F0F0;
}

.settings-item:last-child {
  border-bottom: none;
}

.settings-icon-wrap {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.privacy-icon {
  background: rgba(108, 92, 231, 0.1);
  color: #6C5CE7;
}

.agreement-icon {
  background: rgba(0, 184, 148, 0.1);
  color: #00B894;
}

.about-icon {
  background: rgba(116, 185, 255, 0.1);
  color: #74B9FF;
}

.settings-label {
  flex: 1;
  font-size: 28rpx;
  color: #2D3436;
}

.settings-value {
  font-size: 24rpx;
  color: #B2BEC3;
}

.settings-arrow {
  font-size: 32rpx;
  color: #B2BEC3;
}

/* ---- 退出按钮 ---- */
.logout-area {
  padding: 0 32rpx 48rpx;
}

.logout-btn {
  height: 88rpx;
  line-height: 88rpx;
  background: rgba(225, 112, 85, 0.08);
  color: #E17055;
  font-size: 30rpx;
  font-weight: 500;
  border-radius: 24rpx;
  border: none;
}

.logout-btn::after {
  border: none;
}
</style>
