<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { request } from '../../../utils/request'

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

async function loadCards() {
  try {
    const res = await request<BusinessCard[]>({
      url: '/business-cards',
      method: 'GET',
    })
    if (res.success && res.data) {
      cards.value = res.data
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function goScan() {
  uni.navigateTo({ url: '/pages/ocr/scan/scan' })
}

function goCardDetail(card: BusinessCard) {
  const data = card.ocrData ? encodeURIComponent(JSON.stringify(card.ocrData)) : ''
  uni.navigateTo({ url: `/pages/card-detail/card-detail?cardId=${card.id}&data=${data}` })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

// 获取头像首字母及温度色
function getAvatarColor(name: string): string {
  const colors = ['#6C5CE7', '#74B9FF', '#FD79A8', '#FDCB6E', '#00B894', '#E17055']
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

onMounted(() => {
  loadCards()
})
</script>

<template>
  <view class="card-wall">
    <view v-if="cards.length > 0" class="cards-grid">
      <view
        v-for="(card, index) in cards"
        :key="card.id"
        class="card-item"
        :style="{ animationDelay: `${index * 0.05}s` }"
        @click="goCardDetail(card)"
      >
        <view class="card-item__gradient" />
        <view class="card-item__content">
          <!-- 头像 -->
          <view class="card-item__avatar" :style="{ background: getAvatarColor(card.ocrData?.name || '') }">
            <text class="card-item__avatar-text">{{ card.ocrData?.name ? card.ocrData.name.charAt(0) : '?' }}</text>
          </view>
          <!-- 信息 -->
          <view class="card-item__info">
            <text class="card-item__name">{{ card.ocrData?.name || '未识别' }}</text>
            <text v-if="card.ocrData?.company" class="card-item__company">{{ card.ocrData.company }}</text>
            <text v-if="card.ocrData?.title" class="card-item__title">{{ card.ocrData.title }}</text>
          </view>
          <!-- 日期 -->
          <text class="card-item__date">{{ formatDate(card.createdAt) }}</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <view class="empty-state__icon">
        <text class="empty-state__emoji">🃏</text>
      </view>
      <text class="empty-state__title">还没有名片</text>
      <text class="empty-state__desc">扫描第一张名片，建立你的人脉库</text>
    </view>

    <!-- 底部扫描按钮 -->
    <view class="scan-fab" @click="goScan">
      <view class="scan-fab__inner">
        <text class="scan-fab__icon">+</text>
        <text class="scan-fab__text">扫描名片</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.card-wall {
  min-height: 100vh;
  background: linear-gradient(180deg, $bg-main 0%, #EDE7FF 100%);
  padding: $space-md;
  padding-bottom: 200rpx;
}

/* 瀑布流网格 */
.cards-grid {
  columns: 2;
  column-gap: $space-sm;
}

/* 名片卡片 */
.card-item {
  break-inside: avoid;
  position: relative;
  border-radius: $radius-md;
  overflow: hidden;
  box-shadow: $shadow-card;
  margin-bottom: $space-sm;
  animation: cardFadeIn 0.4s ease-out both;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card-item:active {
  transform: scale(0.98);
  box-shadow: $shadow-card-hover;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-item__gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60rpx;
  background: linear-gradient(135deg, $primary 0%, $primary-light 100%);
  opacity: 0.08;
}

.card-item__content {
  position: relative;
  z-index: 1;
  background: $bg-card;
  padding: $space-md;
}

.card-item__avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: $space-sm;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.card-item__avatar-text {
  color: #fff;
  font-size: $font-md;
  font-weight: 700;
}

.card-item__info {
  margin-bottom: $space-sm;
}

.card-item__name {
  font-size: $font-md;
  font-weight: 600;
  color: $text-primary;
  display: block;
  margin-bottom: 6rpx;
  line-height: 1.3;
}

.card-item__company {
  font-size: $font-xs;
  color: $text-secondary;
  display: block;
  margin-bottom: 4rpx;
  line-height: 1.4;
}

.card-item__title {
  font-size: $font-xs;
  color: $primary-light;
  display: block;
  line-height: 1.4;
}

.card-item__date {
  font-size: 20rpx;
  color: $text-tertiary;
  display: block;
  text-align: right;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: $space-xl;
}

.empty-state__icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: $radius-full;
  background: linear-gradient(135deg, rgba(108, 92, 231, 0.1), rgba(253, 121, 168, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: $space-md;
}

.empty-state__emoji {
  font-size: 64rpx;
}

.empty-state__title {
  font-size: $font-lg;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: $space-xs;
}

.empty-state__desc {
  font-size: $font-sm;
  color: $text-secondary;
  text-align: center;
  line-height: 1.6;
}

/* 浮动扫描按钮 */
.scan-fab {
  position: fixed;
  bottom: calc($space-xl + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.scan-fab__inner {
  height: 88rpx;
  padding: 0 $space-lg;
  border-radius: $radius-full;
  background: linear-gradient(135deg, $primary 0%, $temp-warm 100%);
  box-shadow: $shadow-float;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-xs;
  transition: transform 0.2s ease;
}

.scan-fab:active .scan-fab__inner {
  transform: scale(0.95);
}

.scan-fab__icon {
  color: #fff;
  font-size: $font-lg;
  font-weight: 700;
  line-height: 1;
}

.scan-fab__text {
  color: #fff;
  font-size: $font-sm;
  font-weight: 500;
  letter-spacing: 1rpx;
}
</style>
