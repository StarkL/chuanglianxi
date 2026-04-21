import { request } from '../utils/request.js'

export interface Reminder {
  id: string
  userId: string
  contactId: string | null
  type: 'relationship' | 'birthday' | 'custom'
  message: string
  scheduledAt: string
  sentAt: string | null
  recurrenceRule: string | null
  contact?: {
    id: string
    name: string
  } | null
}

export function getReminders(params?: { type?: string; contactId?: string }) {
  return request<Reminder[]>({
    url: '/reminders',
    method: 'GET',
    data: params as Record<string, unknown>
  })
}

export function getPendingReminders() {
  return request<Reminder[]>({
    url: '/reminders/pending',
    method: 'GET'
  })
}

export function createReminder(data: {
  contactId?: string
  type: 'relationship' | 'birthday' | 'custom'
  message: string
  scheduledAt: string
  recurrenceRule?: string
}) {
  return request<Reminder>({
    url: '/reminders',
    method: 'POST',
    data: data as Record<string, unknown>
  })
}

export function updateReminder(
  id: string,
  data: {
    message?: string
    scheduledAt?: string
    recurrenceRule?: string
  }
) {
  return request<Reminder>({
    url: `/reminders/${id}`,
    method: 'PUT',
    data: data as Record<string, unknown>
  })
}

export function deleteReminder(id: string) {
  return request({
    url: `/reminders/${id}`,
    method: 'DELETE'
  })
}
