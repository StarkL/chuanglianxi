<script setup lang="ts">
import { ref } from 'vue'
import { request } from '../../../utils/request.js'

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
    <view class="scan-icon">
      <text class="icon-text">📷</text>
    </view>
    <text class="scan-title">扫描名片</text>
    <text class="scan-hint">拍照或从相册选择名片</text>

    <button
      class="scan-btn"
      :loading="scanning"
      :disabled="scanning"
      @click="handleScan"
    >
      {{ scanning ? '识别中...' : '选择图片' }}
    </button>
  </view>
</template>

<style scoped>
.scan-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
}

.scan-icon {
  width: 160rpx;
  height: 160rpx;
  background-color: #e8f8ef;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
}

.icon-text {
  font-size: 80rpx;
}

.scan-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.scan-hint {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 96rpx;
}

.scan-btn {
  width: calc(100% - 64rpx);
  height: 88rpx;
  line-height: 88rpx;
  background-color: #07c160;
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 16rpx;
  border: none;
}
</style>
