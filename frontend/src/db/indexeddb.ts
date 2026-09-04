/**
 * 本地 IndexedDB 数据库引擎 (Local-First Architecture)
 * 支持 At-Rest 加密：敏感字段在存入 IndexedDB 之前必须由 AES-256-GCM 本地加密
 * 零外部依赖，完全原生支持 iOS Safari / Android Chrome / 桌面 PWA
 */

import { encryptField, decryptField, getOrCreateUserKey } from '../utils/crypto'
import type { Contact, ContactDetail } from '../api/contacts'
import type { Interaction } from '../api/interactions'

const DB_NAME = 'clx_local_db'
const DB_VERSION = 1

const STORE_CONTACTS = 'contacts'
const STORE_INTERACTIONS = 'interactions'
const STORE_REMINDERS = 'reminders'

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'clx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9)
}

let dbInstance: IDBDatabase | null = null

/**
 * 打开并初始化本地 IndexedDB
 */
export function openLocalDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance)
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result

      // 1. 联系人表
      if (!db.objectStoreNames.contains(STORE_CONTACTS)) {
        const contactStore = db.createObjectStore(STORE_CONTACTS, { keyPath: 'id' })
        contactStore.createIndex('name', 'name', { unique: false })
        contactStore.createIndex('updatedAt', 'updatedAt', { unique: false })
      }

      // 2. 交互记录表
      if (!db.objectStoreNames.contains(STORE_INTERACTIONS)) {
        const interactionStore = db.createObjectStore(STORE_INTERACTIONS, { keyPath: 'id' })
        interactionStore.createIndex('contactId', 'contactId', { unique: false })
        interactionStore.createIndex('occurredAt', 'occurredAt', { unique: false })
      }

      // 3. 提醒表
      if (!db.objectStoreNames.contains(STORE_REMINDERS)) {
        const reminderStore = db.createObjectStore(STORE_REMINDERS, { keyPath: 'id' })
        reminderStore.createIndex('contactId', 'contactId', { unique: false })
        reminderStore.createIndex('scheduledAt', 'scheduledAt', { unique: false })
      }
    }

    request.onsuccess = (e) => {
      dbInstance = (e.target as IDBOpenDBRequest).result
      resolve(dbInstance)
    }

    request.onerror = (e) => {
      console.error('打开本地 IndexedDB 失败:', e)
      reject(new Error('无法打开本地数据库'))
    }
  })
}

// -------------------------------------------------------------
// 本地落盘加密 / 读取解密适配器 (At-Rest Encryption)
// -------------------------------------------------------------

/**
 * 将联系人记录加密后存入本地数据库
 * phone, email, wechatId 必须加密
 */
async function encryptContactForStorage(contact: Contact): Promise<Contact> {
  const key = await getOrCreateUserKey()
  const copy = { ...contact }
  if (copy.phone) copy.phone = await encryptField(copy.phone, key)
  if (copy.email) copy.email = await encryptField(copy.email, key)
  if (copy.wechatId) copy.wechatId = await encryptField(copy.wechatId, key)
  return copy
}

/**
 * 从本地数据库读出联系人记录并透明解密
 */
async function decryptContactFromStorage(contact: Contact): Promise<Contact> {
  const key = await getOrCreateUserKey()
  const copy = { ...contact }
  if (copy.phone) copy.phone = await decryptField(copy.phone, key)
  if (copy.email) copy.email = await decryptField(copy.email, key)
  if (copy.wechatId) copy.wechatId = await decryptField(copy.wechatId, key)
  return copy
}

/**
 * 将交互记录加密后存入本地数据库
 * content 必须加密
 */
async function encryptInteractionForStorage(interaction: Interaction): Promise<Interaction> {
  const key = await getOrCreateUserKey()
  const copy = { ...interaction }
  if (copy.content) copy.content = await encryptField(copy.content, key)
  return copy
}

/**
 * 从本地数据库读出交互记录并透明解密
 */
async function decryptInteractionFromStorage(interaction: Interaction): Promise<Interaction> {
  const key = await getOrCreateUserKey()
  const copy = { ...interaction }
  if (copy.content) copy.content = await decryptField(copy.content, key)
  return copy
}

// -------------------------------------------------------------
// 联系人相关 CRUD (本地模式)
// -------------------------------------------------------------

export async function localGetContacts(params?: { search?: string; tag?: string }): Promise<{ success: boolean; data: Contact[] }> {
  const db = await openLocalDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTACTS, 'readonly')
    const store = tx.objectStore(STORE_CONTACTS)
    const request = store.getAll()

    request.onsuccess = async () => {
      let list = (request.result as Contact[]) || []

      // 降序排序
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

      // 标签过滤
      if (params?.tag) {
        list = list.filter(c => Array.isArray(c.tags) && c.tags.includes(params.tag!))
      }

      // 搜索过滤（支持姓名、公司）
      if (params?.search) {
        const q = params.search.trim().toLowerCase()
        list = list.filter(c => 
          (c.name && c.name.toLowerCase().includes(q)) || 
          (c.company && c.company.toLowerCase().includes(q))
        )
      }

      // 透明解密
      const decryptedList = await Promise.all(list.map(c => decryptContactFromStorage(c)))
      resolve({ success: true, data: decryptedList })
    }

    request.onerror = () => reject(new Error('读取本地联系人列表失败'))
  })
}

export async function localGetContact(id: string): Promise<{ success: boolean; data?: ContactDetail; error?: string }> {
  const db = await openLocalDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CONTACTS, STORE_INTERACTIONS], 'readonly')
    const contactStore = tx.objectStore(STORE_CONTACTS)
    const interactionStore = tx.objectStore(STORE_INTERACTIONS)

    const contactReq = contactStore.get(id)
    contactReq.onsuccess = async () => {
      const contact = contactReq.result as Contact | undefined
      if (!contact) {
        return resolve({ success: false, error: '联系人不存在' })
      }

      const decrypted = await decryptContactFromStorage(contact)

      // 查询关联的交互记录
      const interactionIndex = interactionStore.index('contactId')
      const interactionsReq = interactionIndex.getAll(id)

      interactionsReq.onsuccess = async () => {
        const rawInteractions = (interactionsReq.result as Interaction[]) || []
        rawInteractions.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
        const decryptedInteractions = await Promise.all(rawInteractions.map(i => decryptInteractionFromStorage(i)))

        const detail: ContactDetail = {
          ...decrypted,
          interactions: decryptedInteractions.map(i => ({
            id: i.id,
            type: i.type,
            content: i.content,
            duration: i.duration,
            occurredAt: i.occurredAt
          }))
        }
        resolve({ success: true, data: detail })
      }
    }

    contactReq.onerror = () => reject(new Error('读取本地联系人详情失败'))
  })
}

export async function localCreateContact(data: Partial<Contact> & { ignoreDuplicate?: boolean }): Promise<{ success: boolean; data?: Contact; error?: string }> {
  const db = await openLocalDB()
  const name = data.name?.trim() || ''

  if (!data.ignoreDuplicate) {
    // 查重
    const existingList = await localGetContacts()
    const duplicate = existingList.data.find(c => c.name === name)
    if (duplicate) {
      return {
        success: false,
        error: 'duplicate',
        data: duplicate
      }
    }
  }

  const now = new Date().toISOString()
  const newContact: Contact = {
    id: data.id || generateUUID(),
    name,
    company: data.company?.trim() || null,
    title: data.title?.trim() || null,
    phone: data.phone?.trim() || null,
    email: data.email?.trim() || null,
    wechatId: data.wechatId?.trim() || null,
    avatar: data.avatar || null,
    source: data.source || 'manual',
    tags: data.tags || [],
    birthdayType: data.birthdayType || null,
    birthday: data.birthday || null,
    lunarMonth: data.lunarMonth || null,
    lunarDay: data.lunarDay || null,
    createdAt: now,
    updatedAt: now
  }

  // 加密后再落盘 IndexedDB
  const encryptedContact = await encryptContactForStorage(newContact)

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTACTS, 'readwrite')
    const store = tx.objectStore(STORE_CONTACTS)
    const request = store.add(encryptedContact)

    request.onsuccess = () => {
      resolve({ success: true, data: newContact })
    }
    request.onerror = () => reject(new Error('保存联系人到本地失败'))
  })
}

export async function localUpdateContact(id: string, data: Partial<Contact>): Promise<{ success: boolean; data?: Contact; error?: string }> {
  const db = await openLocalDB()
  const getRes = await localGetContact(id)
  if (!getRes.success || !getRes.data) {
    return { success: false, error: '联系人不存在' }
  }

  const existing = getRes.data
  const now = new Date().toISOString()

  const updated: Contact = {
    ...existing,
    ...data,
    id,
    updatedAt: now
  }

  const encrypted = await encryptContactForStorage(updated)

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTACTS, 'readwrite')
    const store = tx.objectStore(STORE_CONTACTS)
    const request = store.put(encrypted)

    request.onsuccess = () => {
      resolve({ success: true, data: updated })
    }
    request.onerror = () => reject(new Error('更新本地联系人失败'))
  })
}

export async function localDeleteContact(id: string): Promise<{ success: boolean }> {
  const db = await openLocalDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CONTACTS, STORE_INTERACTIONS], 'readwrite')
    const contactStore = tx.objectStore(STORE_CONTACTS)
    const interactionStore = tx.objectStore(STORE_INTERACTIONS)

    contactStore.delete(id)

    // 删除所有属于该联系人的交互
    const index = interactionStore.index('contactId')
    const req = index.getAllKeys(id)
    req.onsuccess = () => {
      const keys = req.result
      for (const k of keys) {
        interactionStore.delete(k)
      }
    }

    tx.oncomplete = () => resolve({ success: true })
    tx.onerror = () => reject(new Error('删除本地联系人失败'))
  })
}

export async function localBatchImportContacts(params: { contacts: Array<any>; defaultTag?: string }): Promise<{ success: boolean; data: { imported: number; duplicates: number } }> {
  const db = await openLocalDB()
  const existingList = await localGetContacts()
  const existingNames = new Set(existingList.data.map(c => c.name))

  let imported = 0
  let duplicates = 0

  const toAdd: Contact[] = []
  const now = new Date().toISOString()

  for (const item of params.contacts) {
    const name = item.name?.trim()
    if (!name) continue

    if (existingNames.has(name)) {
      duplicates++
      continue
    }

    existingNames.add(name)
    const tags = item.tags || []
    if (params.defaultTag && !tags.includes(params.defaultTag)) {
      tags.push(params.defaultTag)
    }

    toAdd.push({
      id: generateUUID(),
      name,
      company: item.company?.trim() || null,
      title: item.title?.trim() || null,
      phone: item.phone?.trim() || null,
      email: item.email?.trim() || null,
      wechatId: item.wechatId?.trim() || null,
      avatar: null,
      source: item.source || 'batch_import',
      tags,
      birthdayType: null,
      birthday: null,
      lunarMonth: null,
      lunarDay: null,
      createdAt: now,
      updatedAt: now
    })
    imported++
  }

  // 批量加密并写入
  const encryptedToAdd = await Promise.all(toAdd.map(c => encryptContactForStorage(c)))

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTACTS, 'readwrite')
    const store = tx.objectStore(STORE_CONTACTS)

    for (const item of encryptedToAdd) {
      store.add(item)
    }

    tx.oncomplete = () => {
      resolve({
        success: true,
        data: { imported, duplicates }
      })
    }
    tx.onerror = () => reject(new Error('批量导入本地联系人失败'))
  })
}

// -------------------------------------------------------------
// 交互记录相关 (本地模式)
// -------------------------------------------------------------

export async function localCreateInteraction(data: {
  contactId: string
  type: string
  content: string
  duration?: number
  occurredAt?: string
}): Promise<{ success: boolean; data: Interaction }> {
  const db = await openLocalDB()
  const now = new Date().toISOString()
  const interaction: Interaction = {
    id: generateUUID(),
    contactId: data.contactId,
    type: data.type,
    content: data.content,
    duration: data.duration ?? null,
    occurredAt: data.occurredAt || now,
    createdAt: now
  }

  const encrypted = await encryptInteractionForStorage(interaction)

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_INTERACTIONS, 'readwrite')
    const store = tx.objectStore(STORE_INTERACTIONS)
    const req = store.add(encrypted)

    req.onsuccess = () => resolve({ success: true, data: interaction })
    req.onerror = () => reject(new Error('保存本地交互记录失败'))
  })
}

export async function localUpdateInteraction(
  id: string,
  data: Partial<Omit<Interaction, 'id' | 'contactId' | 'createdAt'>>
): Promise<{ success: boolean; data: Interaction }> {
  const db = await openLocalDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_INTERACTIONS, 'readwrite')
    const store = tx.objectStore(STORE_INTERACTIONS)
    const getReq = store.get(id)

    getReq.onsuccess = async () => {
      const existing = getReq.result as Interaction | undefined
      if (!existing) return reject(new Error('记录不存在'))

      const decrypted = await decryptInteractionFromStorage(existing)
      const updated = { ...decrypted, ...data }
      const encrypted = await encryptInteractionForStorage(updated)

      const putReq = store.put(encrypted)
      putReq.onsuccess = () => resolve({ success: true, data: updated })
      putReq.onerror = () => reject(new Error('更新本地交互记录失败'))
    }

    getReq.onerror = () => reject(new Error('查询本地交互记录失败'))
  })
}

export async function localDeleteInteraction(id: string): Promise<{ success: boolean }> {
  const db = await openLocalDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_INTERACTIONS, 'readwrite')
    const store = tx.objectStore(STORE_INTERACTIONS)
    const req = store.delete(id)
    req.onsuccess = () => resolve({ success: true })
    req.onerror = () => reject(new Error('删除本地交互记录失败'))
  })
}

// -------------------------------------------------------------
// 数据导出、全量清除与恢复 (备份与双向迁移支持)
// -------------------------------------------------------------

export interface LocalExportPayload {
  version: number
  exportedAt: string
  contacts: Contact[]
  interactions: Interaction[]
}

/**
 * 导出全部解密后的明文数据（用于用户本地 JSON 备份或向云端迁移）
 */
export async function localExportAllData(): Promise<LocalExportPayload> {
  const db = await openLocalDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CONTACTS, STORE_INTERACTIONS], 'readonly')
    const contactStore = tx.objectStore(STORE_CONTACTS)
    const interactionStore = tx.objectStore(STORE_INTERACTIONS)

    const cReq = contactStore.getAll()
    const iReq = interactionStore.getAll()

    let rawContacts: Contact[] = []
    let rawInteractions: Interaction[] = []

    cReq.onsuccess = () => { rawContacts = (cReq.result as Contact[]) || [] }
    iReq.onsuccess = () => { rawInteractions = (iReq.result as Interaction[]) || [] }

    tx.oncomplete = async () => {
      const contacts = await Promise.all(rawContacts.map(c => decryptContactFromStorage(c)))
      const interactions = await Promise.all(rawInteractions.map(i => decryptInteractionFromStorage(i)))
      resolve({
        version: 1,
        exportedAt: new Date().toISOString(),
        contacts,
        interactions
      })
    }

    tx.onerror = () => reject(new Error('导出本地数据失败'))
  })
}

/**
 * 导出全部加密的原始落盘数据（用于直接检查 IndexedDB 密文）
 */
export async function localGetRawEncryptedRecords(): Promise<{ contacts: Contact[]; interactions: Interaction[] }> {
  const db = await openLocalDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CONTACTS, STORE_INTERACTIONS], 'readonly')
    const contactStore = tx.objectStore(STORE_CONTACTS)
    const interactionStore = tx.objectStore(STORE_INTERACTIONS)

    const cReq = contactStore.getAll()
    const iReq = interactionStore.getAll()

    tx.oncomplete = () => {
      resolve({
        contacts: (cReq.result as Contact[]) || [],
        interactions: (iReq.result as Interaction[]) || []
      })
    }
    tx.onerror = () => reject(new Error('读取本地原始密文数据失败'))
  })
}

/**
 * 清空本地数据库所有联系人与交互记录
 */
export async function localClearAllData(): Promise<void> {
  const db = await openLocalDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CONTACTS, STORE_INTERACTIONS, STORE_REMINDERS], 'readwrite')
    tx.objectStore(STORE_CONTACTS).clear()
    tx.objectStore(STORE_INTERACTIONS).clear()
    tx.objectStore(STORE_REMINDERS).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new Error('清空本地数据库失败'))
  })
}

/**
 * 恢复/导入本地备份数据（自动加密落盘）
 */
export async function localRestoreData(payload: LocalExportPayload): Promise<{ contactsRestored: number; interactionsRestored: number }> {
  const db = await openLocalDB()
  await localClearAllData()

  const encryptedContacts = await Promise.all((payload.contacts || []).map(c => encryptContactForStorage(c)))
  const encryptedInteractions = await Promise.all((payload.interactions || []).map(i => encryptInteractionForStorage(i)))

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CONTACTS, STORE_INTERACTIONS], 'readwrite')
    const cStore = tx.objectStore(STORE_CONTACTS)
    const iStore = tx.objectStore(STORE_INTERACTIONS)

    for (const c of encryptedContacts) cStore.put(c)
    for (const i of encryptedInteractions) iStore.put(i)

    tx.oncomplete = () => {
      resolve({
        contactsRestored: encryptedContacts.length,
        interactionsRestored: encryptedInteractions.length
      })
    }
    tx.onerror = () => reject(new Error('恢复本地数据失败'))
  })
}
