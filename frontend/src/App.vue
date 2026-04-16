<script setup lang="ts">
import { getToken, setUserInfo } from './utils/auth.js'
import { verifyToken } from './api/auth.js'

async function checkSession(): Promise<boolean> {
  const token = getToken()
  if (!token) return false

  try {
    const res = await verifyToken()
    return res.success
  } catch {
    return false
  }
}

function navigateToLogin(): void {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const route = currentPage?.route

  uni.reLaunch({
    url: `/pages/login/login${route && route !== 'pages/login/login' ? `?redirect=${encodeURIComponent(route)}` : ''}`,
  })
}

async function checkAndRedirect(): Promise<void> {
  const isValid = await checkSession()
  if (!isValid) {
    uni.removeStorageSync('token')
    uni.removeStorageSync('userInfo')
    navigateToLogin()
  }
}
</script>

<template>
  <view class="app">
    <slot />
  </view>
</template>

<style>
page {
  background-color: #f5f5f5;
}
</style>
