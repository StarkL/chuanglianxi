<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getUserInfo, clearSession } from '../../utils/auth.js'
import { logout } from '../../api/auth.js'

const userInfo = ref<{ nickname: string | null; avatar: string | null } | null>(null)

onMounted(() => {
  const info = getUserInfo()
  userInfo.value = info
})

async function handleLogout() {
  try {
    await logout()
  } catch {
    // Server may be unreachable, clear local session anyway
  } finally {
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

function goContacts() {
  uni.navigateTo({ url: '/pages/contacts/list' })
}

function goReminders() {
  uni.navigateTo({ url: '/pages/reminders/list/list' })
}

function goScan() {
  uni.navigateTo({ url: '/pages/ocr/scan/scan' })
}

function goCards() {
  uni.navigateTo({ url: '/pages/ocr/cards/cards' })
}

interface NavItem {
  icon: string
  label: string
  action: () => void
}

const navItems: NavItem[] = [
  { icon: 'user-group', label: '联系人', action: goContacts },
  { icon: 'notification', label: '提醒', action: goReminders },
  { icon: 'scan', label: '扫描名片', action: goScan },
  { icon: 'card', label: '名片墙', action: goCards },
]
</script>

<template>
  <view class="home">
    <view v-if="userInfo" class="user-section">
      <wd-cell-group border>
        <wd-cell center>
          <template #icon>
            <view class="avatar-circle">
              <text v-if="userInfo.nickname" class="avatar-text">
                {{ userInfo.nickname.charAt(0) }}
              </text>
              <text v-else class="avatar-text">👤</text>
            </view>
          </template>
          <template #title>
            <text class="nickname">
              {{ userInfo.nickname || '未设置昵称' }}
            </text>
          </template>
        </wd-cell>
      </wd-cell-group>
    </view>

    <view class="welcome">
      <text class="title">欢迎使用常联系</text>
      <text class="subtitle">你的人脉管理助手</text>
    </view>

    <wd-gap :height="16" :bg-color="'transparent'" />

    <view class="nav-section">
      <wd-grid :column="2" border clickable>
        <wd-grid-item
          v-for="item in navItems"
          :key="item.label"
          @click="item.action"
        >
          <template #icon>
            <wd-icon :name="item.icon" size="28px" />
          </template>
          <template #text>
            <text class="nav-label">{{ item.label }}</text>
          </template>
        </wd-grid-item>
      </wd-grid>
    </view>

    <view class="action-section">
      <wd-button block @click="confirmLogout" custom-class="logout-btn">
        退出登录
      </wd-button>
    </view>
  </view>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 32rpx;
  min-height: 100vh;
}

.user-section {
  width: 100%;
  margin-bottom: 48rpx;
}

.avatar-circle {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: #f6f6f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 36rpx;
  color: #999;
}

.nickname {
  font-size: 32rpx;
  color: #333;
  font-weight: 600;
}

.welcome {
  text-align: center;
  margin-bottom: 32rpx;
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
  margin-bottom: 32rpx;
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

<style>
.logout-btn {
  --wot-button-color: #e64340 !important;
  --wot-button-border-color: #eee !important;
}
</style>
