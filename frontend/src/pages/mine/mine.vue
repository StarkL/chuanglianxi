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
</script>

<template>
  <view class="mine">
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

    <view v-else class="user-section">
      <wd-cell-group border>
        <wd-cell center>
          <template #icon>
            <view class="avatar-circle">
              <text class="avatar-text">👤</text>
            </view>
          </template>
          <template #title>
            <text class="nickname">未登录</text>
          </template>
        </wd-cell>
      </wd-cell-group>
    </view>

    <wd-gap :height="32" />

    <view class="action-section">
      <wd-button block @click="confirmLogout" custom-class="logout-btn">
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
  margin-bottom: 16rpx;
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
