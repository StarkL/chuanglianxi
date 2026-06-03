<script setup lang="ts">
import { ref } from 'vue'
import { importContactFromPhone } from '../../api/contacts'

interface LoginRes {
  code?: string
}

interface ContactChooseRes {
  encryptedData?: string
  iv?: string
}

interface WechatError {
  errMsg?: string
}

const importing = ref(false)

async function handleImport() {
  if (importing.value) return
  try {
    const loginRes = await new Promise<LoginRes>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: resolve,
        fail: reject,
      })
    })

    const code = loginRes.code
    if (!code) {
      uni.showToast({ title: '获取登录凭证失败', icon: 'none' })
      return
    }

    uni.chooseContact({
      success: async (res: unknown) => {
        const contactRes = res as ContactChooseRes
        if (!contactRes.encryptedData || !contactRes.iv) {
          uni.hideLoading()
          uni.showToast({ title: '无法获取联系人数据', icon: 'none' })
          return
        }
        importing.value = true
        uni.showLoading({ title: '导入中...' })
        try {
          const result = await importContactFromPhone(code, contactRes.encryptedData, contactRes.iv)
          uni.hideLoading()
          if (result.success && result.data) {
            if (result.data.duplicate) {
              uni.showModal({
                title: '提示',
                content: '该联系人已存在',
                showCancel: false,
                confirmText: '确定',
              })
            } else {
              uni.showToast({ title: '导入成功', icon: 'success' })
              setTimeout(() => uni.navigateBack(), 500)
            }
          } else {
            uni.showToast({ title: result.error || '导入失败', icon: 'none' })
          }
        } catch {
          uni.hideLoading()
          uni.showToast({ title: '导入失败', icon: 'none' })
        } finally {
          importing.value = false
        }
      },
      fail: (err: unknown) => {
        const wechatErr = err as WechatError
        if (wechatErr.errMsg && wechatErr.errMsg.includes('permission')) {
          uni.showToast({ title: '需要通讯录权限', icon: 'none' })
        } else {
          uni.showToast({ title: '取消选择', icon: 'none' })
        }
      },
    })
  } catch {
    uni.showToast({ title: '获取登录凭证失败', icon: 'none' })
  }
}
</script>

<template>
  <view class="import-page">
    <!-- 顶部装饰 -->
    <view class="import-hero">
      <view class="hero-circle hero-circle-1" />
      <view class="hero-circle hero-circle-2" />
      <view class="import-icon">
        <text class="icon-text">📇</text>
      </view>
    </view>

    <!-- 内容区 -->
    <view class="import-content">
      <text class="import-title">从手机通讯录导入</text>
      <text class="import-hint">选择联系人后自动创建档案</text>

      <!-- 说明卡片 -->
      <view class="tips-card">
        <view class="tip-item">
          <text class="tip-icon">✅</text>
          <text class="tip-text">自动获取联系人姓名和电话</text>
        </view>
        <view class="tip-item">
          <text class="tip-icon">🔄</text>
          <text class="tip-text">重复联系人会自动提示</text>
        </view>
        <view class="tip-item">
          <text class="tip-icon">🔒</text>
          <text class="tip-text">通讯录数据仅用于导入，不会上传</text>
        </view>
      </view>

      <!-- 导入按钮 -->
      <view class="import-btn-wrap">
        <view
          class="import-btn"
          :class="{ importing }"
          @click="handleImport"
        >
          <text class="import-btn-text">
            {{ importing ? '导入中...' : '选择联系人' }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.import-page {
  min-height: 100vh;
  background-color: #F8F9FA;
  display: flex;
  flex-direction: column;
}

/* ---- 顶部装饰区 ---- */
.import-hero {
  position: relative;
  height: 400rpx;
  background: linear-gradient(135deg, #6C5CE7, #FD79A8);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.hero-circle-1 {
  width: 300rpx;
  height: 300rpx;
  top: -80rpx;
  right: -60rpx;
  animation: float 6s ease-in-out infinite;
}

.hero-circle-2 {
  width: 200rpx;
  height: 200rpx;
  bottom: -40rpx;
  left: -40rpx;
  animation: float 8s ease-in-out infinite reverse;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20rpx) scale(1.1); }
}

.import-icon {
  width: 160rpx;
  height: 160rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
}

.icon-text {
  font-size: 80rpx;
}

/* ---- 内容区 ---- */
.import-content {
  flex: 1;
  padding: 48rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: -32rpx;
  position: relative;
  z-index: 2;
}

.import-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #2D3436;
  margin-bottom: 16rpx;
}

.import-hint {
  font-size: 28rpx;
  color: #636E72;
  margin-bottom: 48rpx;
}

/* ---- 说明卡片 ---- */
.tips-card {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
  margin-bottom: 48rpx;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
}

.tip-item:not(:last-child) {
  border-bottom: 1rpx solid #F0F0F0;
}

.tip-icon {
  font-size: 32rpx;
}

.tip-text {
  font-size: 28rpx;
  color: #2D3436;
}

/* ---- 导入按钮 ---- */
.import-btn-wrap {
  width: 100%;
}

.import-btn {
  width: 100%;
  height: 104rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #6C5CE7, #A29BFE);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(108, 92, 231, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.import-btn:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 16rpx rgba(108, 92, 231, 0.2);
}

.import-btn.importing {
  opacity: 0.7;
  pointer-events: none;
}

.import-btn-text {
  font-size: 34rpx;
  color: #FFFFFF;
  font-weight: 600;
  letter-spacing: 4rpx;
}
</style>
