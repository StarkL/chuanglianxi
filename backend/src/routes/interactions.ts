import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

interface CreateInteractionBody {
  contactId: string
  type: string
  content: string
  duration?: number
  occurredAt?: string
}

export async function interactionRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateInteractionBody }>(
    '/interactions',
    {
      preHandler: [requireAuth],
      schema: {
        body: {
          type: 'object',
          required: ['contactId', 'type', 'content'],
          properties: {
            contactId: { type: 'string' },
            type: { type: 'string', enum: ['voice_note', 'chat_export', 'manual_note', 'call', 'meeting'] },
            content: { type: 'string' },
            duration: { type: 'number' },
            occurredAt: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateInteractionBody }>) => {
      const { userId } = request as AuthenticatedRequest
      const { contactId, type, content, duration, occurredAt } = request.body

      const contact = await prisma.contact.findFirst({
        where: { id: contactId, userId },
        select: { id: true },
      })

      if (!contact) {
        throw new Error('联系人不存在')
      }

      const interaction = await prisma.interaction.create({
        data: {
          contactId,
          userId,
          type,
          content,
          duration,
          occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        },
      })

      return { success: true, data: interaction }
    },
  )
}
