<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import type { ConfigProviderThemeVars } from 'wot-design-uni'
import { getToken } from './utils/auth'
import { verifyToken } from './api/auth'
// #ifdef H5
import { initPwaManager } from './utils/pwa'
import { initAppPermissions } from './utils/permissions'
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
  initAppPermissions()
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
/* 全局盒模型统一与默认重置 */
*, *::before, *::after {
  box-sizing: border-box;
}

page {
  background-color: #F8F9FA;
  height: 100%;
  box-sizing: border-box;
}

/* #ifdef H5 */
/* 消除 uni-app 在有 tabbar 时给 uni-page-wrapper 插入的多余 50px ::after 幽灵占位块 */
.uni-app--showtabbar uni-page-wrapper::after {
  display: none !important;
}

/* 让 TabBar 页面允许根据内容自然伸展滚动，同时无内容时刚好占满单屏视口 */
.uni-app--showtabbar uni-page {
  min-height: 100% !important;
  height: auto !important;
}

.uni-app--showtabbar uni-page-head[uni-page-head-type="default"] ~ uni-page-wrapper {
  min-height: calc(100% - 44px) !important;
  height: auto !important;
}

uni-page-body {
  min-height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

uni-page-body > uni-view,
uni-page-body > view {
  flex: 1 0 auto;
  min-height: 100%;
  box-sizing: border-box;
}

.uni-swiper-navigation {
  display: none !important;
}

/* PC / 宽屏 / PWA 桌面独立模式：限制手机比例居中展示 */
@media screen and (min-width: 500px) {
  html, body {
    height: 100% !important;
    overflow: hidden !important; /* 彻底去除外部浏览器/窗口滚动条 */
    background-color: #EBF0F6;
    background-image: radial-gradient(#D5DFEB 1px, transparent 1px);
    background-size: 24px 24px;
    margin: 0;
    padding: 0;
  }

  uni-app {
    max-width: 440px !important;
    width: 440px !important;
    height: 100% !important;
    max-height: 100vh !important;
    margin: 0 auto !important;
    box-shadow: 0 12px 48px rgba(31, 38, 135, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06);
    position: relative;
    background-color: #F8F9FA;
    overflow-x: hidden !important;
    overflow-y: auto !important; /* 保持内部单滚动条 */
  }

  uni-page {
    position: relative !important;
    width: 100% !important;
    min-height: 100% !important;
  }

  uni-page-wrapper {
    width: 100% !important;
  }

  /* 顶部导航头（NavBar）：保留正常文档流（44px 占位），仅内部固定栏居中 */
  uni-page-head {
    position: static !important;
    transform: none !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  uni-page-head .uni-page-head {
    position: fixed !important;
    max-width: 440px !important;
    width: 100% !important;
    left: 50% !important;
    right: auto !important;
    top: 0 !important;
    transform: translateX(-50%) !important;
    margin: 0 auto !important;
    z-index: 998 !important;
  }

  /* 底部 TabBar：居中并去除多余 placeholder 堆叠 */
  uni-tabbar {
    position: fixed !important;
    max-width: 440px !important;
    width: 100% !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    right: auto !important;
    bottom: 0 !important;
    z-index: 998 !important;
  }

  uni-tabbar .uni-tabbar {
    position: relative !important;
    max-width: 440px !important;
    width: 100% !important;
    left: 0 !important;
    transform: none !important;
  }

  uni-tabbar .uni-placeholder {
    display: none !important;
  }

  .fab {
    right: calc(50% - 220px + 32rpx) !important;
  }

  .fab-popover {
    right: calc(50% - 220px + 32rpx) !important;
  }

  .float-btn {
    right: calc(50% - 220px + 48rpx) !important;
  }

  .scan-fab {
    left: 50% !important;
    transform: translateX(-50%) !important;
  }

  .pwa-modal-mask,
  .modal-mask,
  .delete-confirm-mask,
  .fab-mask {
    width: 100% !important;
    max-width: 440px !important;
    left: 50% !important;
    right: auto !important;
    transform: translateX(-50%) !important;
  }

  /* 滚动条优雅美化 */
  uni-app::-webkit-scrollbar,
  uni-page-wrapper::-webkit-scrollbar {
    width: 5px;
  }
  uni-app::-webkit-scrollbar-track,
  uni-page-wrapper::-webkit-scrollbar-track {
    background: transparent;
  }
  uni-app::-webkit-scrollbar-thumb,
  uni-page-wrapper::-webkit-scrollbar-thumb {
    background: rgba(108, 92, 231, 0.25);
    border-radius: 6px;
  }
  uni-app::-webkit-scrollbar-thumb:hover,
  uni-page-wrapper::-webkit-scrollbar-thumb:hover {
    background: rgba(108, 92, 231, 0.45);
  }
}
/* #endif */
</style>
