/**
 * 常联系 (ChangLianXi) PWA Service Worker
 * Version: 1.0.1
 */

const CACHE_NAME = 'changlianxi-pwa-v2'
const BASE_PATH = '/crm/'

// 预缓存核心静态资产
const PRECACHE_ASSETS = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}icon.svg`,
  `${BASE_PATH}icon-192.png`,
  `${BASE_PATH}icon-512.png`,
  `${BASE_PATH}apple-touch-icon.png`
]

// 安装事件：预缓存关键静态文件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache assets failed:', err)
      })
    }).then(() => self.skipWaiting())
  )
})

// 激活事件：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key)
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// 请求拦截策略
self.addEventListener('fetch', (event) => {
  const request = event.request

  // 只拦截 GET 请求
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return
  }

  const url = new URL(request.url)

  // API 路由：网络优先
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ success: false, error: '网络连接不可用，请检查网络设置' }),
          { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
        )
      })
    )
    return
  }

  // 页面导航请求
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(`${BASE_PATH}index.html`) || caches.match(BASE_PATH)
      })
    )
    return
  }

  // 静态资产：优先缓存，缓存未命中则回退网络
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // 后台静默刷新缓存
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse))
          }
        }).catch(() => {})
        return cachedResponse
      }
      return fetch(request)
    })
  )
})
