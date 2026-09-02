import { ref } from 'vue'

// 存储全局 beforeinstallprompt 事件
let deferredPrompt: any = null

export const isPwaInstallable = ref(false)
export const isPwaInstalled = ref(false)

/**
 * 初始化 PWA 管理器与 Service Worker
 */
export function initPwaManager() {
  if (typeof window === 'undefined') return

  // 1. 检查是否已经在 Standalone（已添加到主屏幕）模式下运行
  checkStandalone()

  // 2. 监听 display-mode 变化
  window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
    isPwaInstalled.value = e.matches
    if (e.matches) {
      isPwaInstallable.value = false
    }
  })

  // 3. 监听浏览器 PWA 安装提示事件 (Chrome, Edge, Android 等)
  window.addEventListener('beforeinstallprompt', (e) => {
    // 阻止浏览器默认迷你信息栏
    e.preventDefault()
    deferredPrompt = e
    isPwaInstallable.value = true
    console.log('[PWA] beforeinstallprompt event captured')
  })

  // 4. 监听 appinstalled 事件
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App successfully installed')
    isPwaInstalled.value = true
    isPwaInstallable.value = false
    deferredPrompt = null
  })

  // 5. 注册 Service Worker (生产环境或支持的环境下)
  registerServiceWorker()
}

/**
 * 注册 Service Worker
 */
function registerServiceWorker() {
  const isTest = (import.meta as any).env?.MODE === 'test'
  if ('serviceWorker' in navigator && !isTest) {
    window.addEventListener('load', () => {
      const swUrl = '/crm/sw.js'
      navigator.serviceWorker
        .register(swUrl, { scope: '/crm/' })
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope)
          // 检查是否有更新
          reg.onupdatefound = () => {
            const installingWorker = reg.installing
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New content is available; please refresh.')
                }
              }
            }
          }
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err)
        })
    })
  }
}

/**
 * 检查是否处于独立应用模式 (Standalone)
 */
export function checkStandalone(): boolean {
  if (typeof window === 'undefined') return false

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true ||
    document.referrer.includes('android-app://')

  isPwaInstalled.value = isStandalone
  return isStandalone
}

/**
 * 判断是否为 iOS 设备环境
 */
export function isIos(): boolean {
  if (typeof window === 'undefined') return false
  const userAgent = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent)
}

/**
 * 触发 PWA 安装
 * @returns 'accepted' | 'dismissed' | 'manual-ios' | 'unsupported'
 */
export async function triggerPwaInstall(): Promise<'accepted' | 'dismissed' | 'manual-ios' | 'unsupported'> {
  if (isIos()) {
    return 'manual-ios'
  }

  if (!deferredPrompt) {
    return 'unsupported'
  }

  try {
    deferredPrompt.prompt()
    const choiceResult = await deferredPrompt.userChoice
    if (choiceResult.outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt')
      isPwaInstalled.value = true
      isPwaInstallable.value = false
      deferredPrompt = null
      return 'accepted'
    } else {
      console.log('[PWA] User dismissed the install prompt')
      return 'dismissed'
    }
  } catch (error) {
    console.error('[PWA] Error triggering install prompt:', error)
    return 'unsupported'
  }
}
