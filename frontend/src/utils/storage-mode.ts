/**
 * 数据存储模式管理器 (Storage Mode Manager)
 * 协调纯本地存储 (Local-First IndexedDB) 与云端同步模式 (Cloud E2EE Fastify API)
 * 支持双向无损迁移与本地备份导出/恢复
 */

import {
  localExportAllData,
  localRestoreData,
  localClearAllData,
  localGetContacts,
  localCreateContact,
  localCreateInteraction,
  type LocalExportPayload
} from '../db/indexeddb'
import { emitDataChanged } from './events'
import { request } from './request'

export type StorageMode = 'local' | 'cloud'

const STORAGE_MODE_KEY = 'clx_storage_mode'

/**
 * 获取当前存储模式，默认使用云端 (cloud)
 */
export function getStorageMode(): StorageMode {
  const mode = uni.getStorageSync(STORAGE_MODE_KEY)
  if (mode === 'local' || mode === 'cloud') {
    return mode
  }
  return 'cloud'
}

/**
 * 设置存储模式并通知各页面刷新
 */
export function setStorageMode(mode: StorageMode): void {
  uni.setStorageSync(STORAGE_MODE_KEY, mode)
  if (mode === 'local') {
    requestStoragePersistence().catch(() => {})
  }
  emitDataChanged('contacts', 'update')
}

/**
 * 申请浏览器持久化存储配额 (防御 iOS Safari / Android 7天垃圾清理)
 */
export async function requestStoragePersistence(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
    try {
      const isPersisted = await navigator.storage.persist()
      return isPersisted
    } catch {
      return false
    }
  }
  return false
}

/**
 * 检查当前是否已获得持久化存储配额
 */
export async function isStoragePersisted(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persisted === 'function') {
    try {
      return await navigator.storage.persisted()
    } catch {
      return false
    }
  }
  return false
}

// -------------------------------------------------------------
// 双向数据迁移 (Data Migration)
// -------------------------------------------------------------

/**
 * 从本地迁移至云端 (Local -> Cloud)
 * 将 IndexedDB 中所有加密的联系人及交互逐项上传到云端，并将模式置为 'cloud'
 */
export async function migrateLocalToCloud(onProgress?: (curr: number, total: number) => void): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const payload = await localExportAllData()
    const total = payload.contacts.length
    let count = 0

    // 导入联系人
    for (const c of payload.contacts) {
      const createRes = await request<{ id: string }>({
        url: '/contacts',
        method: 'POST',
        data: {
          name: c.name,
          company: c.company || undefined,
          title: c.title || undefined,
          phone: c.phone || undefined,
          email: c.email || undefined,
          wechatId: c.wechatId || undefined,
          source: c.source || undefined,
          tags: c.tags || [],
          birthdayType: c.birthdayType || undefined,
          birthday: c.birthday || undefined,
          lunarMonth: c.lunarMonth || undefined,
          lunarDay: c.lunarDay || undefined,
          ignoreDuplicate: true
        }
      })

      const newCloudContactId = createRes.data?.id

      // 导入该联系人名下的交互记录
      if (newCloudContactId) {
        const relatedInteractions = payload.interactions.filter(i => i.contactId === c.id)
        for (const it of relatedInteractions) {
          await request({
            url: '/interactions',
            method: 'POST',
            data: {
              contactId: newCloudContactId,
              type: it.type,
              content: it.content,
              duration: it.duration || undefined,
              occurredAt: it.occurredAt
            }
          })
        }
      }

      count++
      if (onProgress) onProgress(count, total)
    }

    setStorageMode('cloud')
    return { success: true, count }
  } catch (err: any) {
    console.error('本地向云端迁移失败:', err)
    return { success: false, count: 0, error: err?.message || '迁移失败' }
  }
}

/**
 * 从云端迁移至本地 (Cloud -> Local)
 * 从 Fastify 后端全量拉取联系人并存入 IndexedDB，可选择是否清空云端备份
 */
export async function migrateCloudToLocal(options?: {
  deleteCloudData?: boolean
  onProgress?: (curr: number, total: number) => void
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // 1. 获取云端所有联系人
    const listRes = await request<any[]>({
      url: '/contacts',
      method: 'GET'
    })

    if (!listRes.success || !Array.isArray(listRes.data)) {
      throw new Error(listRes.error || '获取云端数据失败')
    }

    const cloudContacts = listRes.data
    const total = cloudContacts.length
    let count = 0

    const contactsToSave: any[] = []
    const interactionsToSave: any[] = []

    for (const item of cloudContacts) {
      // 获取详情（包含 interactions）
      const detailRes = await request<any>({
        url: `/contacts/${item.id}`,
        method: 'GET'
      })

      if (detailRes.success && detailRes.data) {
        const d = detailRes.data
        contactsToSave.push({
          id: d.id,
          name: d.name,
          company: d.company,
          title: d.title,
          phone: d.phone,
          email: d.email,
          wechatId: d.wechatId,
          avatar: d.avatar,
          source: d.source,
          tags: d.tags || [],
          birthdayType: d.birthdayType,
          birthday: d.birthday,
          lunarMonth: d.lunarMonth,
          lunarDay: d.lunarDay,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt
        })

        if (Array.isArray(d.interactions)) {
          for (const it of d.interactions) {
            interactionsToSave.push({
              id: it.id,
              contactId: d.id,
              type: it.type,
              content: it.content,
              duration: it.duration,
              occurredAt: it.occurredAt,
              createdAt: it.occurredAt
            })
          }
        }
      }

      count++
      if (options?.onProgress) options.onProgress(count, total)
    }

    // 2. 存入本地 IndexedDB
    await localRestoreData({
      version: 1,
      exportedAt: new Date().toISOString(),
      contacts: contactsToSave,
      interactions: interactionsToSave
    })

    // 3. 若用户勾选清空云端备份
    if (options?.deleteCloudData) {
      for (const item of cloudContacts) {
        try {
          await request({ url: `/contacts/${item.id}`, method: 'DELETE' })
        } catch (e) {
          console.warn('清空云端联系人失败:', item.id, e)
        }
      }
    }

    setStorageMode('local')
    return { success: true, count: contactsToSave.length }
  } catch (err: any) {
    console.error('云端向本地迁移失败:', err)
    return { success: false, count: 0, error: err?.message || '迁移失败' }
  }
}

// -------------------------------------------------------------
// 本地备份与恢复导出 (Backup & Restore)
// -------------------------------------------------------------

export interface LocalBackupMeta {
  contactsCount: number
  interactionsCount: number
  sizeBytes: number
  sizeFormatted: string
  isOversized: boolean // >= 1MB
  jsonString: string
}

/**
 * 获取本地数据体积与统计信息
 */
export async function getLocalBackupMeta(): Promise<LocalBackupMeta> {
  const data = await localExportAllData()
  const jsonString = JSON.stringify(data, null, 2)
  const sizeBytes = new Blob([jsonString]).size
  let sizeFormatted = `${sizeBytes} B`
  if (sizeBytes >= 1024 * 1024) {
    sizeFormatted = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
  } else if (sizeBytes >= 1024) {
    sizeFormatted = `${(sizeBytes / 1024).toFixed(1)} KB`
  }

  return {
    contactsCount: data.contacts.length,
    interactionsCount: data.interactions.length,
    sizeBytes,
    sizeFormatted,
    isOversized: sizeBytes >= 1024 * 1024,
    jsonString
  }
}

/**
 * 导出本地备份为 JSON 字符串
 */
export async function exportLocalBackupString(): Promise<string> {
  const data = await localExportAllData()
  return JSON.stringify(data, null, 2)
}

/**
 * 下载本地备份文件为 .json
 */
export async function downloadLocalBackupFile(jsonContent?: string): Promise<{ success: boolean; filename: string }> {
  const content = jsonContent || (await exportLocalBackupString())
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '') + '_' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0')
  const filename = `changlianxi_backup_${dateStr}.json`

  // #ifdef H5
  if (typeof window !== 'undefined') {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    return { success: true, filename }
  }
  // #endif

  return { success: false, filename }
}

/**
 * 标准导入 JSON 格式示例
 */
export const BACKUP_JSON_EXAMPLE = `{
  "version": 1,
  "exportedAt": "2026-09-04T12:00:00.000Z",
  "contacts": [
    {
      "name": "张三 (必填)",
      "phone": "13800138000",
      "company": "常联系科技",
      "title": "总监",
      "email": "zhangsan@example.com",
      "wechatId": "zhangsan_wx",
      "tags": ["工作", "VIP"]
    }
  ],
  "interactions": [
    {
      "type": "manual_note",
      "content": "跟进纪要内容",
      "occurredAt": "2026-09-04T10:00:00.000Z"
    }
  ]
}`

/**
 * 从 JSON 备份字符串中恢复本地数据
 */
export async function importLocalBackupString(jsonString: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString.trim()) as LocalExportPayload
    if (!parsed || !Array.isArray(parsed.contacts)) {
      return { success: false, count: 0, error: '备份格式不正确：必须包含 contacts 数组' }
    }

    const res = await localRestoreData(parsed)
    emitDataChanged('contacts', 'update')
    return { success: true, count: res.contactsRestored }
  } catch (err: any) {
    return { success: false, count: 0, error: '解析备份数据失败: ' + err.message }
  }
}
