<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { request } from '../../utils/request'
import { createContact, type Contact } from '../../api/contacts'

interface OcrData {
  name: string
  company: string
  title: string
  phone: string
  email: string
  website: string | null
  address: string | null
  wechatId: string | null
}

const cardId = ref('')
const ocrData = ref<OcrData | null>(null)
const loading = ref(false)
const saving = ref(false)

onMounted(async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as { $page: { options: { cardId?: string; data?: string } } }
  const { cardId: cid, data } = currentPage.$page.options || {}

  if (cid) cardId.value = cid
  if (data) {
    try {
      ocrData.value = JSON.parse(decodeURIComponent(data))
    } catch {
      ocrData.value = null
    }
  }
})

async function saveAsContact() {
  if (!ocrData.value || !ocrData.value.name) {
    uni.showToast({ title: '无有效姓名', icon: 'none' })
    return
  }

  saving.value = true
  try {
    const data: Partial<Contact> = {
      name: ocrData.value.name,
      company: ocrData.value.company || undefined,
      title: ocrData.value.title || undefined,
      phone: ocrData.value.phone || undefined,
      email: ocrData.value.email || undefined,
      wechatId: ocrData.value.wechatId || undefined,
      source: 'ocr',
      tags: [],
    }
    await createContact(data)
    uni.showToast({ title: '已保存为联系人', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack({ delta: 2 })
    }, 500)
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

async function deleteCard() {
  uni.showModal({
    title: '确认删除？',
    content: '删除后无法恢复该名片',
    confirmColor: '#e64340',
    success: async (res: unknown) => {
      const result = res as { confirm: boolean }
      if (result.confirm) {
        try {
          await request({ url: `/business-cards/${cardId.value}`, method: 'DELETE' })
          uni.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 500)
        } catch {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

function callPhone(phone: string) {
  uni.makePhoneCall({ phoneNumber: phone })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getInitial(name: string): string {
  return name ? name.charAt(0) : '?'
}
</script>

<template>
  <view class="card-detail-page">
    <view v-if="!ocrData" class="empty">
      <wd-status-tip image="content" tip="名片信息不存在" />
    </view>

    <template v-else>
      <!-- 名片大图头部 -->
      <view class="detail-header">
        <view class="detail-header__gradient" />
        <view class="detail-header__content">
          <view class="detail-header__avatar">
            <text class="detail-header__initial">{{ getInitial(ocrData.name) }}</text>
          </view>
          <text class="detail-header__name">{{ ocrData.name || '未识别' }}</text>
          <text v-if="ocrData.company || ocrData.title" class="detail-header__subtitle">
            {{ ocrData.company }}<text v-if="ocrData.company && ocrData.title"> · </text>{{ ocrData.title }}
          </text>
        </view>
      </view>

      <!-- 信息卡片 -->
      <view class="info-section">
        <text class="info-section__title">联系方式</text>
        <view class="info-card">
          <view v-if="ocrData.phone" class="info-row" @click="callPhone(ocrData.phone)">
            <view class="info-row__icon-wrap info-row__icon-wrap--phone">
              <text class="info-row__icon">📞</text>
            </view>
            <view class="info-row__content">
              <text class="info-row__label">电话</text>
              <text class="info-row__value">{{ ocrData.phone }}</text>
            </view>
            <text class="info-row__arrow">›</text>
          </view>

          <view v-if="ocrData.email" class="info-row">
            <view class="info-row__icon-wrap info-row__icon-wrap--mail">
              <text class="info-row__icon">✉️</text>
            </view>
            <view class="info-row__content">
              <text class="info-row__label">邮箱</text>
              <text class="info-row__value">{{ ocrData.email }}</text>
            </view>
          </view>

          <view v-if="ocrData.wechatId" class="info-row">
            <view class="info-row__icon-wrap info-row__icon-wrap--wechat">
              <text class="info-row__icon">💬</text>
            </view>
            <view class="info-row__content">
              <text class="info-row__label">微信</text>
              <text class="info-row__value">{{ ocrData.wechatId }}</text>
            </view>
          </view>

          <view v-if="ocrData.website" class="info-row">
            <view class="info-row__icon-wrap info-row__icon-wrap--web">
              <text class="info-row__icon">🌐</text>
            </view>
            <view class="info-row__content">
              <text class="info-row__label">网站</text>
              <text class="info-row__value">{{ ocrData.website }}</text>
            </view>
          </view>

          <view v-if="ocrData.address" class="info-row">
            <view class="info-row__icon-wrap info-row__icon-wrap--location">
              <text class="info-row__icon">📍</text>
            </view>
            <view class="info-row__content">
              <text class="info-row__label">地址</text>
              <text class="info-row__value">{{ ocrData.address }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部操作区 -->
      <view class="actions">
        <view class="btn-save" :class="{ 'btn-save--loading': saving }" @click="saveAsContact">
          <text class="btn-save__text">{{ saving ? '保存中...' : '保存为联系人' }}</text>
        </view>
        <view class="btn-delete" @click="deleteCard">
          <text class="btn-delete__text">删除名片</text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.card-detail-page {
  min-height: 100vh;
  background: $bg-main;
  padding-bottom: 200rpx;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

/* 名片大图头部 */
.detail-header {
  position: relative;
  overflow: hidden;
  padding: $space-lg $space-md $space-md;
  margin-bottom: $space-md;
}

.detail-header__gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, $primary 0%, $primary-light 50%, $temp-warm 100%);
  opacity: 0.12;
}

.detail-header__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.detail-header__avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: $radius-full;
  background: linear-gradient(135deg, $primary 0%, $temp-warm 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(108, 92, 231, 0.25);
  margin-bottom: $space-sm;
}

.detail-header__initial {
  color: #fff;
  font-size: $font-xxl;
  font-weight: 700;
}

.detail-header__name {
  font-size: $font-xl;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: 6rpx;
}

.detail-header__subtitle {
  font-size: $font-sm;
  color: $text-secondary;
}

/* 信息区 */
.info-section {
  padding: 0 $space-md;
  margin-bottom: $space-md;
}

.info-section__title {
  font-size: $font-md;
  font-weight: 600;
  color: $text-primary;
  display: block;
  margin-bottom: $space-sm;
  padding-left: $space-xs;
}

.info-card {
  background: $bg-card;
  border-radius: $radius-md;
  box-shadow: $shadow-card;
  overflow: hidden;
}

.info-row {
  display: flex;
  align-items: center;
  padding: $space-sm $space-md;
  transition: background 0.2s ease;
}

.info-row:active {
  background: $bg-card-hover;
}

.info-row__icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: $space-sm;
  flex-shrink: 0;
}

.info-row__icon-wrap--phone { background: rgba(116, 185, 255, 0.15); }
.info-row__icon-wrap--mail { background: rgba(253, 121, 168, 0.15); }
.info-row__icon-wrap--wechat { background: rgba(0, 184, 148, 0.15); }
.info-row__icon-wrap--web { background: rgba(108, 92, 231, 0.15); }
.info-row__icon-wrap--location { background: rgba(253, 203, 110, 0.15); }

.info-row__icon {
  font-size: 32rpx;
}

.info-row__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.info-row__label {
  font-size: $font-xs;
  color: $text-tertiary;
  margin-bottom: 2rpx;
}

.info-row__value {
  font-size: $font-sm;
  color: $text-primary;
  line-height: 1.4;
}

.info-row__arrow {
  font-size: 40rpx;
  color: $text-tertiary;
  margin-left: $space-xs;
}

/* 分隔线 */
.info-card .info-row + .info-row {
  border-top: 1rpx solid $border-light;
}

/* 底部操作区 */
.actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: $space-sm $space-md;
  padding-bottom: calc($space-sm + env(safe-area-inset-bottom));
  background: linear-gradient(to top, rgba(248, 249, 250, 0.98), rgba(248, 249, 250, 0.9));
  backdrop-filter: blur(12rpx);
}

.btn-save {
  width: 100%;
  height: 88rpx;
  border-radius: $radius-md;
  background: linear-gradient(135deg, $primary 0%, $primary-light 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(108, 92, 231, 0.25);
  transition: transform 0.2s ease;
  margin-bottom: $space-sm;
}

.btn-save:active {
  transform: scale(0.98);
}

.btn-save--loading {
  opacity: 0.8;
}

.btn-save__text {
  color: #fff;
  font-size: $font-md;
  font-weight: 600;
  letter-spacing: 2rpx;
}

.btn-delete {
  width: 100%;
  height: 88rpx;
  border-radius: $radius-md;
  background: rgba(225, 112, 85, 0.08);
  border: 2rpx solid rgba(225, 112, 85, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.btn-delete:active {
  transform: scale(0.98);
}

.btn-delete__text {
  color: $urgent;
  font-size: $font-md;
  font-weight: 500;
  letter-spacing: 2rpx;
}
</style>
