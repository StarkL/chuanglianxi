<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getUserInfo } from '../../utils/auth.js'

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
</script>

<template>
  <view class="home">
    <view v-if="userInfo" class="user-section">
      <view class="welcome">
        <text class="title">欢迎使用常联系</text>
        <text class="subtitle">
          {{ userInfo.nickname || '你的人脉管理助手' }}
        </text>
      </view>
    </view>

    <view v-else class="user-section">
      <view class="welcome">
        <text class="title">欢迎使用常联系</text>
        <text class="subtitle">你的人脉管理助手</text>
      </view>
    </view>

    <wd-gap :height="16" :bg-color="'transparent'" />

    <view class="nav-section">
      <wd-grid :column="2" :border="false">
        <wd-grid-item @click="goScan">
          <template #icon>
            <wd-icon name="scan" size="28px" color="#07c160" />
          </template>
          <template #text>
            <text class="nav-label">扫描名片</text>
          </template>
        </wd-grid-item>
        <wd-grid-item @click="goCards">
          <template #icon>
            <wd-icon name="star" size="28px" color="#07c160" />
          </template>
          <template #text>
            <text class="nav-label">名片墙</text>
          </template>
        </wd-grid-item>
      </wd-grid>
    </view>
  </view>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 32rpx;
  min-height: 100vh;
}

.user-section {
  width: 100%;
  text-align: center;
}

.welcome {
  text-align: center;
  margin-bottom: 32rpx;
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
}

.nav-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
}
</style>
