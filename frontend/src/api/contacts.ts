import { request } from '../utils/request'
import { getStorageMode } from '../utils/storage-mode'
import {
  localGetContacts,
  localGetContact,
  localCreateContact,
  localUpdateContact,
  localDeleteContact,
  localBatchImportContacts
} from '../db/indexeddb'

export interface Contact {
  id: string
  name: string
  company: string | null
  title: string | null
  phone: string | null
  email: string | null
  wechatId: string | null
  avatar: string | null
  source?: string | null
  tags: string[]
  birthdayType: string | null
  birthday: string | null
  lunarMonth: number | null
  lunarDay: number | null
  createdAt: string
  updatedAt: string
}

export interface ContactDetail extends Contact {
  interactions: Array<{
    id: string
    type: string
    content: string
    duration: number | null
    occurredAt: string
  }>
}

export async function getContacts(params?: { search?: string; tag?: string }) {
  if (getStorageMode() === 'local') {
    return localGetContacts(params)
  }
  return request<Contact[]>({
    url: '/contacts',
    method: 'GET',
    data: params as Record<string, unknown>
  })
}

export async function getContact(id: string) {
  if (getStorageMode() === 'local') {
    return localGetContact(id)
  }
  return request<ContactDetail>({
    url: `/contacts/${id}`,
    method: 'GET'
  })
}

export interface CreateContactParams extends Partial<Contact> {
  ignoreDuplicate?: boolean
}

export async function createContact(data: CreateContactParams) {
  if (getStorageMode() === 'local') {
    return localCreateContact(data)
  }
  return request<Contact>({
    url: '/contacts',
    method: 'POST',
    data: data as Record<string, unknown>
  })
}

export async function updateContact(id: string, data: Partial<Contact>) {
  if (getStorageMode() === 'local') {
    return localUpdateContact(id, data)
  }
  return request<Contact>({
    url: `/contacts/${id}`,
    method: 'PUT',
    data: data as Record<string, unknown>
  })
}

export async function deleteContact(id: string) {
  if (getStorageMode() === 'local') {
    return localDeleteContact(id)
  }
  return request({
    url: `/contacts/${id}`,
    method: 'DELETE'
  })
}

export interface ImportContactResult {
  success: boolean
  data: Contact
  duplicate: boolean
}

export function importContactFromPhone(code: string, encryptedData: string, iv: string) {
  return request<ImportContactResult>({
    url: '/contacts/import-from-phone',
    method: 'POST',
    data: { code, encryptedData, iv } as Record<string, unknown>
  })
}

export interface BatchImportParams {
  contacts: Array<{
    name: string
    phone?: string
    company?: string
    title?: string
    email?: string
    wechatId?: string
    source?: string
    tags?: string[]
  }>
  defaultTag?: string
}

export interface BatchImportResult {
  total: number
  imported: number
  skipped: number
}

export async function batchImportContacts(data: BatchImportParams) {
  if (getStorageMode() === 'local') {
    const res = await localBatchImportContacts(data)
    return {
      success: true,
      data: {
        total: data.contacts.length,
        imported: res.data.imported,
        skipped: res.data.duplicates
      }
    }
  }
  return request<BatchImportResult>({
    url: '/contacts/batch',
    method: 'POST',
    data: data as unknown as Record<string, unknown>
  })
}
