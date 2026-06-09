import type { FastifyInstance, FastifyRequest } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { extractFromVoiceNote, type VoiceNoteExtractResult } from '../lib/voice-note.js'

interface ProcessVoiceNoteBody {
  transcript: string
  contactId?: string // 可选，如果已经选择了联系人
}

export async function voiceNoteRoutes(fastify: FastifyInstance) {
  /**
   * POST /voice-note/process
   * 处理语音转录文本，提取结构化信息
   */
  fastify.post<{ Body: ProcessVoiceNoteBody }>(
    '/voice-note/process',
    {
      preHandler: [requireAuth],
      schema: {
        body: {
          type: 'object',
          required: ['transcript'],
          properties: {
            transcript: { type: 'string', minLength: 1, maxLength: 5000 },
            contactId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ProcessVoiceNoteBody }>) => {
      const { userId } = request as AuthenticatedRequest
      const { transcript, contactId } = request.body

      // 用 AI 提取结构化信息
      const extracted = await extractFromVoiceNote(transcript)

      // 如果提供了 contactId，验证联系人是否存在
      let contact = null
      if (contactId) {
        contact = await prisma.contact.findFirst({
          where: { id: contactId, userId },
          select: {
            id: true,
            name: true,
            company: true,
            title: true,
          },
        })
      }

      return {
        success: true,
        data: {
          extracted,
          contact,
          originalTranscript: transcript,
        },
      }
    }
  )

  /**
   * POST /voice-note/save
   * 保存语音笔记交互记录
   */
  fastify.post<{
    Body: {
      contactId: string
      transcript: string
      summary: string
      keyPoints: string[]
      reminderAction?: string
      reminderDays?: number
    }
  }>(
    '/voice-note/save',
    {
      preHandler: [requireAuth],
      schema: {
        body: {
          type: 'object',
          required: ['contactId', 'transcript', 'summary'],
          properties: {
            contactId: { type: 'string' },
            transcript: { type: 'string', minLength: 1, maxLength: 5000 },
            summary: { type: 'string', minLength: 1, maxLength: 500 },
            keyPoints: {
              type: 'array',
              items: { type: 'string' },
              maxItems: 10,
            },
            reminderAction: { type: 'string' },
            reminderDays: { type: 'number', minimum: 1, maximum: 365 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          contactId: string
          transcript: string
          summary: string
          keyPoints: string[]
          reminderAction?: string
          reminderDays?: number
        }
      }>
    ) => {
      const { userId } = request as AuthenticatedRequest
      const { contactId, transcript, summary, keyPoints, reminderAction, reminderDays } =
        request.body

      // 验证联系人
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, userId },
        select: { id: true },
      })

      if (!contact) {
        throw new Error('联系人不存在')
      }

      // 构建交互内容（包含摘要和要点）
      const content = [
        `【摘要】${summary}`,
        keyPoints.length > 0 && `【要点】${keyPoints.join('；')}`,
        `【原文】${transcript}`,
      ]
        .filter(Boolean)
        .join('\n')

      // 创建交互记录
      const interaction = await prisma.interaction.create({
        data: {
          contactId,
          userId,
          type: 'voice_note',
          content,
          occurredAt: new Date(),
        },
      })

      // 如果有提醒事项，创建提醒
      let reminder = null
      if (reminderAction && reminderDays) {
        const scheduledAt = new Date()
        scheduledAt.setDate(scheduledAt.getDate() + reminderDays)

        reminder = await prisma.reminder.create({
          data: {
            userId,
            contactId,
            type: 'custom',
            message: `语音笔记提醒：${reminderAction}`,
            scheduledAt,
          },
        })
      }

      return {
        success: true,
        data: {
          interaction,
          reminder,
        },
      }
    }
  )
}
