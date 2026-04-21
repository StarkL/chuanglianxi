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
    <wd-empty image="scan" description="拍照或从相册选择名片" />

    <view class="scan-actions">
      <wd-button
        block
        type="primary"
        :loading="scanning"
        :disabled="scanning"
        @click="handleScan"
      >
        {{ scanning ? '识别中...' : '选择图片' }}
      </wd-button>
    </view>
  </view>
</template>

<style scoped>
.scan-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 64rpx 32rpx;
}

.scan-actions {
  margin-top: 64rpx;
}
</style>
