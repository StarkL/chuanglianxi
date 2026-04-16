<script setup lang="ts">
</script>

<template>
  <view class="home">
    <view class="logo-section">
      <view class="logo">常联系</view>
    </view>
    <view class="welcome">
      <text class="title">欢迎使用常联系</text>
      <text class="subtitle">开启你的人脉管理之旅</text>
    </view>
  </view>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 128rpx 64rpx;
}

.logo-section {
  margin-bottom: 96rpx;
}

.logo {
  font-size: 48rpx;
  font-weight: 600;
  color: #333;
}

.welcome {
  text-align: center;
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
</style>
