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
      <wd-card
        v-for="card in cards"
        :key="card.id"
        :title="card.ocrData?.name || '未识别'"
        :subtitle="card.ocrData?.company || ''"
        :desc="card.ocrData?.title || ''"
      >
        <template #footer>
          <text class="card-date">{{ formatDate(card.createdAt) }}</text>
        </template>
      </wd-card>
    </view>

    <wd-empty
      v-else
      image="content"
      description="暂无名片"
    />

    <!-- #ifdef MP-WEIXIN -->
    <view class="scan-section">
      <wd-button block type="primary" @click="goScan">+ 扫描名片</wd-button>
    </view>
    <!-- #endif -->
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.card-date {
  font-size: 20rpx;
  color: #ccc;
}

.scan-section {
  margin-top: 32rpx;
}
</style>
