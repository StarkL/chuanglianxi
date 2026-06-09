import { request } from '../utils/request'

export interface VoiceNoteExtractResult {
  contactName?: string
  company?: string
  title?: string
  interactionType: 'meeting' | 'call' | 'chat' | 'other'
  summary: string
  keyPoints: string[]
  reminder?: {
    action: string
    daysLater: number
  } | null
}

export interface ProcessVoiceNoteResponse {
  extracted: VoiceNoteExtractResult
  contact?: {
    id: string
    name: string
    company: string | null
    title: string | null
  } | null
  originalTranscript: string
}

export interface SaveVoiceNoteData {
  contactId: string
  transcript: string
  summary: string
  keyPoints: string[]
  reminderAction?: string
  reminderDays?: number
}

export interface SaveVoiceNoteResponse {
  interaction: {
    id: string
    contactId: string
    type: string
    content: string
    occurredAt: string
  }
  reminder?: {
    id: string
    message: string
    scheduledAt: string
  } | null
}

/**
 * 处理语音转录文本，提取结构化信息
 */
export async function processVoiceNote(
  transcript: string,
  contactId?: string
): Promise<ProcessVoiceNoteResponse> {
  return request.post('/voice-note/process', {
    transcript,
    contactId,
  })
}

/**
 * 保存语音笔记交互记录
 */
export async function saveVoiceNote(
  data: SaveVoiceNoteData
): Promise<SaveVoiceNoteResponse> {
  return request.post('/voice-note/save', data)
}
