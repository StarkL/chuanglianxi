<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import type { ConfigProviderThemeVars } from 'wot-design-uni'
import { getToken } from './utils/auth'
import { verifyToken } from './api/auth'

const themeVars: ConfigProviderThemeVars = {
  colorTheme: '#5645d4',
  buttonPrimaryBgColor: '#5645d4',
  buttonPrimaryColor: '#ffffff',
  tabbarActiveColor: '#5645d4',
  colorSuccess: '#5645d4',
  cellTapBg: '#e6e0f5'
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

async function redirectIfUnauthenticated(): Promise<void> {
  const isValid = await checkSession()
  if (!isValid) {
    uni.removeStorageSync('token')
    uni.removeStorageSync('userInfo')
    uni.reLaunch({ url: '/pages/login/login' })
  }
}

// #ifdef H5
// In H5 dev mode, trust the dev-token without backend verification
function skipH5DevVerification(): boolean {
  const token = getToken()
  return token === 'dev-token-h5'
}
// #endif

onLaunch(async () => {
  const token = getToken()
  if (!token) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  // #ifdef H5
  if (skipH5DevVerification()) return
  // #endif
  await redirectIfUnauthenticated()
})
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
  background-color: #f6f5f4;
}
</style>
