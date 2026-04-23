<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getUserInfo } from '../../utils/auth.js'

const userInfo = ref<{ nickname: string | null; avatar: string | null } | null>(null)
const version = 'v0.1.0'

onMounted(() => {
  const info = getUserInfo()
  userInfo.value = info
})

function goPrivacy() {
  uni.navigateTo({ url: '/pages/privacy/privacy' })
}

function goAgreement() {
  uni.navigateTo({ url: '/pages/agreement/agreement' })
}

function goScan() {
  uni.navigateTo({ url: '/pages/ocr/scan/scan' })
}

function goCards() {
  uni.navigateTo({ url: '/pages/ocr/cards/cards' })
}

async function handleLogout() {
  try {
    const { logout } = await import('../../api/auth.js')
    await logout()
  } catch {
    // Server may be unreachable, clear local session anyway
  } finally {
    const { clearSession } = await import('../../utils/auth.js')
    clearSession()
    uni.reLaunch({ url: '/pages/login/login' })
  }
}

function confirmLogout() {
  uni.showModal({
    title: '确认退出？',
    content: '退出后需要重新授权登录',
    confirmColor: '#e64340',
    success: (res) => {
      if (res.confirm) {
        handleLogout()
      }
    },
  })
}
</script>

<template>
  <view class="mine">
    <!-- User info -->
    <view v-if="userInfo" class="user-section">
      <view class="welcome">
        <text class="title">欢迎使用常联系</text>
        <text class="subtitle">
          {{ userInfo.nickname || '你的人脉管理助手' }}
        </text>
      </view>
    </view>

    <view v-else class="user-section">
      <view class="welcome">
        <text class="title">欢迎使用常联系</text>
        <text class="subtitle">你的人脉管理助手</text>
      </view>
    </view>

    <!-- Quick actions -->
    <view class="nav-section">
      <wd-grid :column="2" :border="false">
        <wd-grid-item @click="goScan">
          <template #icon>
            <wd-icon name="scan" size="28px" color="#07c160" />
          </template>
          <template #text>
            <text class="nav-label">扫描名片</text>
          </template>
        </wd-grid-item>
        <wd-grid-item @click="goCards">
          <template #icon>
            <wd-icon name="star" size="28px" color="#07c160" />
          </template>
          <template #text>
            <text class="nav-label">名片墙</text>
          </template>
        </wd-grid-item>
      </wd-grid>
    </view>

    <wd-gap :height="24" :bg-color="'transparent'" />

    <!-- Settings and links -->
    <wd-cell-group title="设置">
      <wd-cell title="隐私政策" is-link @click="goPrivacy" />
      <wd-cell title="用户协议" is-link @click="goAgreement" />
      <wd-cell title="关于常联系" :value="version" />
    </wd-cell-group>

    <wd-gap :height="24" :bg-color="'transparent'" />

    <!-- Logout -->
    <view class="action-section">
      <wd-button block plain type="error" @click="confirmLogout">
        退出登录
      </wd-button>
    </view>
  </view>
</template>

<style scoped>
.mine {
  display: flex;
  flex-direction: column;
  padding: 32rpx;
  min-height: 100vh;
}

.user-section {
  width: 100%;
  text-align: center;
  margin-bottom: 16rpx;
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

.nav-section {
  width: 100%;
}

.nav-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
}

.action-section {
  width: 100%;
}
</style>
