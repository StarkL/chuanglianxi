<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import type { ConfigProviderThemeVars } from 'wot-design-uni'
import { getToken } from './utils/auth'
import { verifyToken } from './api/auth'
// #ifdef H5
import { initPwaManager } from './utils/pwa'
// #endif

const themeVars: ConfigProviderThemeVars = {
  colorTheme: '#6C5CE7',
  buttonPrimaryBgColor: '#6C5CE7',
  buttonPrimaryColor: '#ffffff',
  tabbarActiveColor: '#6C5CE7',
  colorSuccess: '#6C5CE7',
  cellTapBg: '#F0EEFF'
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
  // #ifdef H5
  initPwaManager()
  // #endif

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
  background-color: #F8F9FA;
}

/* #ifdef H5 */
.uni-swiper-navigation {
  display: none !important;
}

/* PC / 宽屏 / PWA 桌面独立模式：限制手机比例居中展示 */
@media screen and (min-width: 500px) {
  html, body {
    background-color: #EBF0F6;
    background-image: radial-gradient(#D5DFEB 1px, transparent 1px);
    background-size: 24px 24px;
    margin: 0;
    padding: 0;
    min-height: 100vh;
  }

  uni-app {
    max-width: 440px !important;
    width: 440px !important;
    min-height: 100vh !important;
    margin: 0 auto !important;
    box-shadow: 0 12px 48px rgba(31, 38, 135, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06);
    position: relative;
    background-color: #F8F9FA;
  }

  uni-page-head {
    max-width: 440px !important;
    width: 440px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    right: auto !important;
  }

  uni-tabbar {
    max-width: 440px !important;
    width: 440px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    right: auto !important;
  }

  .uni-tabbar-bottom {
    max-width: 440px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    right: auto !important;
  }

  .fab {
    right: calc(50% - 220px + 32rpx) !important;
  }

  .pwa-modal-mask,
  .modal-mask,
  .delete-confirm-mask {
    max-width: 440px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
  }
}
/* #endif */
</style>
