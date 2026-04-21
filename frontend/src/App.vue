<script setup lang="ts">
import type { ConfigProviderThemeVars } from 'wot-design-uni'
import { getToken, setUserInfo } from './utils/auth.js'
import { verifyToken } from './api/auth.js'

const themeVars: ConfigProviderThemeVars = {
  colorTheme: '#07c160',
  buttonPrimaryBgColor: '#07c160',
  buttonPrimaryColor: '#ffffff',
  tabbarActiveColor: '#07c160',
  colorSuccess: '#07c160',
  cellTapBg: '#f0f9f4'
}

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
  <wd-config-provider :theme-vars="themeVars">
    <view class="app">
      <slot />
    </view>
  </wd-config-provider>
</template>

<style>
page {
  background-color: #f5f5f5;
}
</style>
