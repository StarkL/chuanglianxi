<script setup lang="ts">
import { ref } from 'vue'
import { request } from '../../../utils/request'

const scanning = ref(false)

async function handleScan() {
  try {
    const imageRes = await new Promise<any>((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['camera', 'album'],
        success: resolve,
        fail: reject,
      })
    })

    const imagePath = imageRes.tempFilePaths[0]

    // Convert image to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      // @ts-ignore - uni-app API
      const fs = uni.getFileSystemManager()
      fs.readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res: any) => resolve(res.data),
        fail: reject,
      })
    })

    scanning.value = true
    uni.showLoading({ title: '识别中...' })

    const result = await request<{
      cardId: string
      ocr: {
        name: string
        company: string
        title: string
        phone: string
        email: string
        website: string | null
        address: string | null
        wechatId: string | null
      }
    }>({
      url: '/ocr/business-card',
      method: 'POST',
      data: { imageData: base64 },
    })

    uni.hideLoading()

    if (result.success && result.data) {
      uni.navigateTo({
        url: `/pages/ocr/result/result?cardId=${result.data.cardId}&data=${encodeURIComponent(JSON.stringify(result.data.ocr))}`,
      })
    } else {
      uni.showToast({ title: result.error || '识别失败', icon: 'none' })
    }
  } catch {
    if (scanning.value) uni.hideLoading()
    uni.showToast({ title: '识别失败，请重试', icon: 'none' })
  } finally {
    scanning.value = false
  }
}
</script>

<template>
  <view class="scan-page">
    <!-- 扫描视窗 -->
    <view class="scan-viewport">
      <!-- 扫描框 -->
      <view class="scan-frame">
        <view class="scan-frame__border" />
        <view class="scan-frame__corner scan-frame__corner--tl" />
        <view class="scan-frame__corner scan-frame__corner--tr" />
        <view class="scan-frame__corner scan-frame__corner--bl" />
        <view class="scan-frame__corner scan-frame__corner--br" />
        <!-- 扫描线动画 -->
        <view class="scan-line" />
      </view>
      <!-- 提示文字 -->
      <text class="scan-hint">将名片放入框内，自动识别信息</text>
    </view>

    <!-- 操作区 -->
    <view class="scan-actions">
      <view class="scan-button-wrap">
        <view class="scan-button" :class="{ 'scan-button--scanning': scanning }" @click="handleScan">
          <view class="scan-button__inner">
            <text v-if="!scanning" class="scan-button__icon">📷</text>
            <text v-else class="scan-button__icon scan-button__icon--pulse">⏳</text>
          </view>
        </view>
        <text class="scan-button__text">{{ scanning ? '识别中...' : '拍照 / 从相册选择' }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.scan-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #F8F9FA 0%, #EDE7FF 50%, #F8F9FA 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-lg $space-md;
}

/* 扫描视窗 */
.scan-viewport {
  width: 100%;
  max-width: 600rpx;
  aspect-ratio: 1 / 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* 扫描框 */
.scan-frame {
  width: 80%;
  aspect-ratio: 1.6 / 1;
  position: relative;
  border-radius: $radius-lg;
  overflow: hidden;
}

.scan-frame__border {
  position: absolute;
  inset: 0;
  border: 2rpx solid rgba(108, 92, 231, 0.3);
  border-radius: $radius-lg;
}

/* 四角装饰 */
.scan-frame__corner {
  position: absolute;
  width: 40rpx;
  height: 40rpx;
}

.scan-frame__corner--tl {
  top: -2rpx;
  left: -2rpx;
  border-top: 4rpx solid $primary;
  border-left: 4rpx solid $primary;
  border-top-left-radius: $radius-lg;
}

.scan-frame__corner--tr {
  top: -2rpx;
  right: -2rpx;
  border-top: 4rpx solid $primary;
  border-right: 4rpx solid $primary;
  border-top-right-radius: $radius-lg;
}

.scan-frame__corner--bl {
  bottom: -2rpx;
  left: -2rpx;
  border-bottom: 4rpx solid $primary;
  border-left: 4rpx solid $primary;
  border-bottom-left-radius: $radius-lg;
}

.scan-frame__corner--br {
  bottom: -2rpx;
  right: -2rpx;
  border-bottom: 4rpx solid $primary;
  border-right: 4rpx solid $primary;
  border-bottom-right-radius: $radius-lg;
}

/* 扫描线动画 */
.scan-line {
  position: absolute;
  top: 0;
  left: 10%;
  width: 80%;
  height: 4rpx;
  background: linear-gradient(90deg, transparent, $primary-light, $primary, $primary-light, transparent);
  border-radius: 2rpx;
  box-shadow: 0 0 20rpx rgba(108, 92, 231, 0.4);
  animation: scanPulse 2.5s ease-in-out infinite;
}

@keyframes scanPulse {
  0%, 100% {
    top: 10%;
    opacity: 0.6;
  }
  50% {
    top: 85%;
    opacity: 1;
  }
}

/* 提示文字 */
.scan-hint {
  margin-top: $space-md;
  font-size: $font-sm;
  color: $text-secondary;
  text-align: center;
  letter-spacing: 1rpx;
}

/* 操作区 */
.scan-actions {
  margin-top: $space-xl;
  width: 100%;
  display: flex;
  justify-content: center;
}

.scan-button-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.scan-button {
  width: 140rpx;
  height: 140rpx;
  border-radius: $radius-full;
  background: linear-gradient(135deg, $primary 0%, $temp-warm 100%);
  box-shadow: $shadow-float;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.scan-button:active {
  transform: scale(0.95);
}

.scan-button--scanning {
  animation: buttonPulse 1.5s ease-in-out infinite;
}

@keyframes buttonPulse {
  0%, 100% {
    box-shadow: 0 16rpx 64rpx rgba(108, 92, 231, 0.2);
  }
  50% {
    box-shadow: 0 16rpx 80rpx rgba(108, 92, 231, 0.35);
  }
}

.scan-button__inner {
  width: 110rpx;
  height: 110rpx;
  border-radius: $radius-full;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8rpx);
}

.scan-button__icon {
  font-size: 56rpx;
  filter: drop-shadow(0 2rpx 4rpx rgba(0, 0, 0, 0.1));
}

.scan-button__icon--pulse {
  animation: iconPulse 1s ease-in-out infinite;
}

@keyframes iconPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.scan-button__text {
  margin-top: $space-sm;
  font-size: $font-sm;
  color: $primary;
  font-weight: 500;
  letter-spacing: 1rpx;
}
</style>
