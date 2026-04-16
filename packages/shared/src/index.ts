export interface User {
  id: string
  openId: string
  nickname: string | null
  avatar: string | null
  subscriptionTier: 'free' | 'pro' | 'ai-enhanced' | 'ai-deep'
  subscriptionEndsAt: Date | null
  createdAt: Date
}

export interface Contact {
  id: string
  userId: string
  name: string
  company: string | null
  title: string | null
  phone: string | null
  wechatId: string | null
  email: string | null
  avatar: string | null
  source: string | null
  tags: string[]
  customFields: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export interface Interaction {
  id: string
  contactId: string
  userId: string
  type: 'voice_note' | 'chat_export' | 'manual_note' | 'call' | 'meeting'
  content: string
  duration: number | null
  occurredAt: Date
  createdAt: Date
}

export interface RelationshipScore {
  id: string
  contactId: string
  userId: string
  score: number
  lastContactDays: number
  interactionFrequency: number
  emotionalTone: number | null
  calculatedAt: Date
}

export interface Reminder {
  id: string
  userId: string
  contactId: string | null
  type: 'relationship' | 'birthday' | 'custom'
  message: string
  scheduledAt: Date
  sentAt: Date | null
  recurrenceRule: string | null
}

export interface BusinessCard {
  id: string
  userId: string
  contactId: string | null
  imageUrl: string
  ocrData: Record<string, unknown> | null
  createdAt: Date
}
