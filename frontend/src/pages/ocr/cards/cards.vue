<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface BusinessCard {
  id: string
  imageUrl: string | null
  ocrData: {
    name: string
    company: string
    title: string
    phone: string
    email: string
  } | null
  createdAt: string
}

const cards = ref<BusinessCard[]>([])
const loading = ref(false)

async function loadCards() {
  loading.value = true
  try {
    const { request } = await import('../../../utils/request.js')
    const res = await request<BusinessCard[]>({
      url: '/business-cards',
      method: 'GET',
    })
    if (res.success && res.data) {
      cards.value = res.data
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goScan() {
  uni.navigateTo({ url: '/pages/ocr/scan/scan' })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}
</script>

<template>
  <view class="card-wall">
    <view v-if="cards.length > 0" class="cards-grid">
      <view
        v-for="card in cards"
        :key="card.id"
        class="card-item"
      >
        <view class="card-content">
          <text class="card-name">{{ card.ocrData?.name || '未识别' }}</text>
          <text v-if="card.ocrData?.company" class="card-company">{{ card.ocrData.company }}</text>
          <text v-if="card.ocrData?.title" class="card-title">{{ card.ocrData.title }}</text>
          <text class="card-date">{{ formatDate(card.createdAt) }}</text>
        </view>
      </view>
    </view>

    <view v-else class="empty">
      <text class="empty-icon">📇</text>
      <text class="empty-text">暂无名片</text>
      <text class="empty-hint">点击下方按钮扫描第一张名片</text>
    </view>

    <button class="scan-btn" @click="goScan">+ 扫描名片</button>
  </view>
</template>

<style scoped>
.card-wall {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 32rpx;
  padding-bottom: 160rpx;
}

.cards-grid {
  columns: 2;
  column-gap: 16rpx;
}

.card-item {
  break-inside: avoid;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.card-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.card-company {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 4rpx;
}

.card-title {
  font-size: 22rpx;
  color: #07c160;
  display: block;
  margin-bottom: 12rpx;
}

.card-date {
  font-size: 20rpx;
  color: #ccc;
  display: block;
}

.empty {
  text-align: center;
  padding: 128rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  display: block;
  margin-bottom: 32rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #999;
  display: block;
  margin-bottom: 16rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #ccc;
  display: block;
}

.scan-btn {
  position: fixed;
  bottom: 64rpx;
  left: 50%;
  transform: translateX(-50%);
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
