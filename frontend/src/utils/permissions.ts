/**
 * 常联系 - 设备与系统权限管理工具库 (Notification & Geolocation)
 */

export interface LocationCoords {
  latitude: number
  longitude: number
  accuracy?: number
  updatedAt: number
}

/**
 * 申请通知权限 (Notification)
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('[Permission] Notifications are not supported in this environment')
    return 'unsupported'
  }

  try {
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      console.log('[Permission] Notification permission result:', permission)
      return permission
    }
    return Notification.permission
  } catch (err) {
    console.warn('[Permission] Failed to request notification permission:', err)
    return 'denied'
  }
}

/**
 * 申请地理定位权限并获取当前经纬度 (Geolocation)
 * 供后续同城联系人感知、同城动态推送使用
 */
export function requestLocationPermission(): Promise<LocationCoords | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      console.log('[Permission] Geolocation is not supported in this environment')
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: LocationCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          updatedAt: Date.now()
        }
        console.log('[Permission] Geolocation obtained:', coords)
        try {
          uni.setStorageSync('user_last_location', JSON.stringify(coords))
        } catch {
          // ignore storage error
        }
        resolve(coords)
      },
      (error) => {
        console.warn('[Permission] Geolocation request error or denied:', error.message)
        resolve(null)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5分钟缓存
      }
    )
  })
}

/**
 * 自动申请核心权限 (通知 + 地理定位)
 */
export async function initAppPermissions() {
  // #ifdef H5
  if (typeof window === 'undefined') return
  console.log('[Permission] Initializing core permissions (Notification & Location)...')
  
  // 1. 申请通知权限
  requestNotificationPermission()

  // 2. 申请定位权限
  requestLocationPermission()
  // #endif
}
