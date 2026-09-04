import { request } from '../utils/request'
import { getStorageMode } from '../utils/storage-mode'
import {
  localCreateInteraction,
  localUpdateInteraction,
  localDeleteInteraction
} from '../db/indexeddb'

export interface Interaction {
  id: string
  contactId: string
  type: string
  content: string
  duration: number | null
  occurredAt: string
  createdAt: string
}

export async function createInteraction(data: {
  contactId: string
  type: string
  content: string
  duration?: number
  occurredAt?: string
}) {
  if (getStorageMode() === 'local') {
    return localCreateInteraction(data)
  }
  return request<Interaction>({
    url: '/interactions',
    method: 'POST',
    data: data as Record<string, unknown>
  })
}

export async function updateInteraction(
  id: string,
  data: Partial<Omit<Interaction, 'id' | 'contactId' | 'createdAt'>>
) {
  if (getStorageMode() === 'local') {
    return localUpdateInteraction(id, data)
  }
  return request<Interaction>({
    url: `/interactions/${id}`,
    method: 'PUT',
    data: data as Record<string, unknown>
  })
}

export async function deleteInteraction(id: string) {
  if (getStorageMode() === 'local') {
    return localDeleteInteraction(id)
  }
  return request({
    url: `/interactions/${id}`,
    method: 'DELETE'
  })
}
