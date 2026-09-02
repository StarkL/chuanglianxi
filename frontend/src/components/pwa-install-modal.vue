<script setup lang="ts">
import { ref, computed } from 'vue'
import { isPwaInstalled, isIos, triggerPwaInstall } from '../utils/pwa'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const isIosDevice = computed(() => isIos())
const isInstalled = computed(() => isPwaInstalled.value)
const installing = ref(false)
const appIcon = '/crm/icon.svg'

function closeModal() {
  emit('update:modelValue', false)
}

async function handleInstallClick() {
  if (isIosDevice.value) {
    // iOS shows manual instructions inside the modal
    return
  }

  installing.value = true
  try {
    const res = await triggerPwaInstall()
    if (res === 'accepted') {
      uni.showToast({ title: '已成功发起安装', icon: 'success' })
      closeModal()
    } else if (res === 'unsupported') {
      uni.showToast({ title: '请使用 Chrome/Edge 或在浏览器菜单选择"添加到主屏幕"', icon: 'none' })
    }
  } finally {
    installing.value = false
  }
}
</script>

<template>
  <view v-if="modelValue" class="pwa-modal-mask" @click.self="closeModal">
    <view class="pwa-modal-container">
      <!-- Header with Icon and Close Button -->
      <view class="pwa-modal-header">
        <image class="pwa-app-icon" :src="appIcon" mode="aspectFit" />
        <view class="pwa-app-info">
          <view class="pwa-app-title">常联系</view>
          <view class="pwa-app-desc">AI 个人人脉资产引擎</view>
        </view>
        <view class="pwa-close-btn" @click="closeModal">✕</view>
      </view>

      <!-- Already Installed State -->
      <view v-if="isInstalled" class="pwa-installed-badge">
        <text class="badge-icon">✅</text>
        <text class="badge-text">您已在桌面应用模式下运行</text>
      </view>

      <!-- App Features / Highlights -->
      <view class="pwa-features-list">
        <view class="feature-item">
          <view class="feature-icon">🚀</view>
          <view class="feature-text">
            <view class="feature-title">全屏独立运行</view>
            <view class="feature-subtitle">脱离浏览器地址栏，沉浸式原生质感</view>
          </view>
        </view>
        <view class="feature-item">
          <view class="feature-icon">⚡</view>
          <view class="feature-text">
            <view class="feature-title">秒级极速打开</view>
            <view class="feature-subtitle">Service Worker 本地离线缓存支持</view>
          </view>
        </view>
        <view class="feature-item">
          <view class="feature-icon">🎙️</view>
          <view class="feature-text">
            <view class="feature-title">长按图标快捷入口</view>
            <view class="feature-subtitle">桌面长按快速触发语音速记与扫名片</view>
          </view>
        </view>
      </view>

      <!-- iOS Step-by-Step Instructions -->
      <view v-if="isIosDevice" class="ios-install-guide">
        <view class="guide-title">iOS Safari 添加步骤：</view>
        <view class="guide-step">
          <text class="step-num">1</text>
          <text class="step-text">点击 Safari 底部中间的 <text class="step-highlight">【分享】</text> 图标 📤</text>
        </view>
        <view class="guide-step">
          <text class="step-num">2</text>
          <text class="step-text">在弹出菜单中向下滑动，选择 <text class="step-highlight">【添加到主屏幕】</text> ➕</text>
        </view>
        <view class="guide-step">
          <text class="step-num">3</text>
          <text class="step-text">点击右上角 <text class="step-highlight">【添加】</text> 即可在手机桌面使用</text>
        </view>
      </view>

      <!-- Android / PC Action Button -->
      <view v-else class="pwa-modal-actions">
        <button
          class="pwa-install-btn"
          :loading="installing"
          :disabled="isInstalled"
          @click="handleInstallClick"
        >
          {{ isInstalled ? '已添加到主屏幕' : '一键添加到主屏幕' }}
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.pwa-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 40rpx;
}

.pwa-modal-container {
  width: 100%;
  max-width: 620rpx;
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 40rpx 36rpx;
  box-shadow: 0 20rpx 60rpx rgba(108, 92, 231, 0.25);
  animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalPop {
  0% {
    opacity: 0;
    transform: scale(0.9) translateY(20rpx);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.pwa-modal-header {
  display: flex;
  align-items: center;
  position: relative;
  margin-bottom: 32rpx;
}

.pwa-app-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 20rpx;
  margin-right: 20rpx;
  box-shadow: 0 6rpx 20rpx rgba(108, 92, 231, 0.2);
}

.pwa-app-info {
  flex: 1;
}

.pwa-app-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #2D3436;
  line-height: 1.3;
}

.pwa-app-desc {
  font-size: 24rpx;
  color: #6C5CE7;
  margin-top: 4rpx;
}

.pwa-close-btn {
  width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  font-size: 32rpx;
  color: #A0AEC0;
  cursor: pointer;
}

.pwa-installed-badge {
  background: #EBFEEB;
  border: 1rpx solid #68D391;
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.badge-text {
  font-size: 26rpx;
  color: #276749;
  font-weight: 500;
}

.pwa-features-list {
  background: #F8F9FA;
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 32rpx;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.feature-icon {
  font-size: 36rpx;
  width: 48rpx;
  text-align: center;
}

.feature-text {
  flex: 1;
}

.feature-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #2D3436;
}

.feature-subtitle {
  font-size: 22rpx;
  color: #718096;
  margin-top: 2rpx;
}

.ios-install-guide {
  background: #F0EEFF;
  border-radius: 20rpx;
  padding: 24rpx;
}

.guide-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #6C5CE7;
  margin-bottom: 16rpx;
}

.guide-step {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.guide-step:last-child {
  margin-bottom: 0;
}

.step-num {
  width: 36rpx;
  height: 36rpx;
  line-height: 36rpx;
  text-align: center;
  background: #6C5CE7;
  color: #FFFFFF;
  border-radius: 50%;
  font-size: 22rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.step-text {
  font-size: 24rpx;
  color: #4A5568;
  line-height: 1.5;
}

.step-highlight {
  color: #6C5CE7;
  font-weight: 600;
}

.pwa-modal-actions {
  margin-top: 8rpx;
}

.pwa-install-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 20rpx;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(108, 92, 231, 0.35);
}

.pwa-install-btn:disabled {
  opacity: 0.6;
}
</style>
