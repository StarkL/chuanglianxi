<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getUserInfo } from '../../utils/auth'

const userInfo = ref<{ nickname: string | null; avatar: string | null } | null>(null)

onMounted(() => {
  const info = getUserInfo()
  userInfo.value = info
})

function goScan() {
  uni.navigateTo({ url: '/pages/ocr/scan/scan' })
}

function goCards() {
  uni.navigateTo({ url: '/pages/ocr/cards/cards' })
}

function goReminders() {
  uni.navigateTo({ url: '/pages/reminders/list/list' })
}

function goContacts() {
  uni.switchTab({ url: '/pages/contacts/list' })
}

function goChatReply() {
  uni.navigateTo({ url: '/pages/ocr/chat-reply/chat-reply' })
}

function goVoiceNote() {
  uni.navigateTo({ url: '/pages/voice-note/voice-note' })
}
</script>

<template>
  <view class="home">
    <!-- 欢迎区域 -->
    <view class="hero-card">
      <view class="hero-bg" />
      <view class="hero-content">
        <text class="greeting">Hi</text>
        <text class="hero-name">{{ userInfo?.nickname || '常联系用户' }}</text>
        <text class="hero-subtitle">开启你的人脉管理之旅</text>
      </view>
    </view>

    <!-- AI 嘴替特色功能入口 -->
    <view class="ai-banner" @click="goChatReply">
      <view class="ai-banner__left">
        <text class="ai-banner__title">AI 嘴替助理</text>
        <text class="ai-banner__desc">截图一键上传，高情商话术生成</text>
      </view>
      <view class="ai-banner__right">
        <view class="ai-banner__icon">
          <wd-icon name="chat" size="28px" color="#FFFFFF" />
        </view>
      </view>
    </view>

    <!-- 核心功能导航 -->
    <view class="nav-section">
      <view class="nav-item" @click="goContacts">
        <view class="nav-icon contacts-icon">
          <wd-icon name="user-group" size="24px" color="#FFFFFF" />
        </view>
        <text class="nav-label">联系人</text>
        <text class="nav-desc">管理你的人脉</text>
      </view>
      <view class="nav-item" @click="goReminders">
        <view class="nav-icon reminders-icon">
          <wd-icon name="alarm" size="24px" color="#FFFFFF" />
        </view>
        <text class="nav-label">提醒</text>
        <text class="nav-desc">不错过重要时刻</text>
      </view>
      <view class="nav-item" @click="goScan">
        <view class="nav-icon scan-icon">
          <wd-icon name="scan" size="24px" color="#FFFFFF" />
        </view>
        <text class="nav-label">扫描名片</text>
        <text class="nav-desc">快速录入人脉</text>
      </view>
      <view class="nav-item" @click="goCards">
        <view class="nav-icon cards-icon">
          <wd-icon name="star" size="24px" color="#FFFFFF" />
        </view>
        <text class="nav-label">名片墙</text>
        <text class="nav-desc">查看收藏名片</text>
      </view>
      <view class="nav-item" @click="goVoiceNote">
        <view class="nav-icon voice-icon">
          <wd-icon name="sound" size="24px" color="#FFFFFF" />
        </view>
        <text class="nav-label">语音速记</text>
        <text class="nav-desc">说话就能记录</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.home {
  min-height: 100vh;
  background-color: #F8F9FA;
  padding: 32rpx;
}

/* ---- Hero 欢迎区域 ---- */
.hero-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 50%, #74B9FF 100%);
  border-radius: 32rpx;
  padding: 56rpx 40rpx 44rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 16rpx 48rpx rgba(108, 92, 231, 0.25);
}

/* ---- AI 嘴替特色条 ---- */
.ai-banner {
  background: linear-gradient(135deg, #FD79A8 0%, #FF7675 100%);
  border-radius: 32rpx;
  padding: 36rpx 40rpx;
  margin-bottom: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 12rpx 36rpx rgba(253, 121, 168, 0.2);
  transition: transform 0.2s ease;
}

.ai-banner:active {
  transform: scale(0.98);
}

.ai-banner__title {
  font-size: 32rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.ai-banner__desc {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 4rpx;
}

.ai-banner__icon {
  width: 90rpx;
  height: 90rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}


.hero-bg {
  position: absolute;
  right: -60rpx;
  bottom: -60rpx;
  width: 240rpx;
  height: 240rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.greeting {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.hero-name {
  font-size: 44rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.hero-subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4rpx;
}

/* ---- 核心功能导航 ---- */
.nav-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}

.nav-item {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
}

.nav-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.contacts-icon {
  background: linear-gradient(135deg, #6C5CE7, #A29BFE);
}

.reminders-icon {
  background: linear-gradient(135deg, #FD79A8, #FDCB6E);
}

.scan-icon {
  background: linear-gradient(135deg, #00B894, #55EFC4);
}

.cards-icon {
  background: linear-gradient(135deg, #74B9FF, #A29BFE);
}

.voice-icon {
  background: linear-gradient(135deg, #00CEC9, #81ECEC);
}

.nav-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D3436;
}

.nav-desc {
  font-size: 22rpx;
  color: #B2BEC3;
}
</style>
