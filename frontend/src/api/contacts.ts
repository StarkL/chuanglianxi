import { request } from '../utils/request.js'

export interface Contact {
  id: string
  name: string
  company: string | null
  title: string | null
  phone: string | null
  email: string | null
  avatar: string | null
  tags: string[]
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

export function getContacts(params?: { search?: string; tag?: string }) {
  return request<Contact[]>({
    url: '/contacts',
    method: 'GET',
    data: params as Record<string, unknown>
  })
}

export function getContact(id: string) {
  return request<ContactDetail>({
    url: `/contacts/${id}`,
    method: 'GET'
  })
}

export function createContact(data: Partial<Contact>) {
  return request<Contact>({
    url: '/contacts',
    method: 'POST',
    data: data as Record<string, unknown>
  })
}

export function updateContact(id: string, data: Partial<Contact>) {
  return request<Contact>({
    url: `/contacts/${id}`,
    method: 'PUT',
    data: data as Record<string, unknown>
  })
}

export function deleteContact(id: string) {
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
