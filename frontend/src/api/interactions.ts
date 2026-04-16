import { request } from '../utils/request.js'

export interface Interaction {
  id: string
  contactId: string
  type: string
  content: string
  duration: number | null
  occurredAt: string
  createdAt: string
}

export function createInteraction(data: {
  contactId: string
  type: string
  content: string
  duration?: number
  occurredAt?: string
}) {
  return request<Interaction>({
    url: '/interactions',
    method: 'POST',
    data: data as Record<string, unknown>
  })
}

export function updateInteraction(
  id: string,
  data: Partial<Omit<Interaction, 'id' | 'contactId' | 'createdAt'>>
) {
  return request<Interaction>({
    url: `/interactions/${id}`,
    method: 'PUT',
    data: data as Record<string, unknown>
  })
}

export function deleteInteraction(id: string) {
  return request({
    url: `/interactions/${id}`,
    method: 'DELETE'
  })
}
