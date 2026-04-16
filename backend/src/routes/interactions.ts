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

interface UpdateInteractionBody {
  type?: 'voice_note' | 'chat_export' | 'manual_note' | 'call' | 'meeting'
  content?: string
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
            type: {
              type: 'string',
              enum: ['voice_note', 'chat_export', 'manual_note', 'call', 'meeting'],
            },
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
    }
  )

  // PUT /interactions/:id — update interaction
  fastify.put<{ Params: { id: string }; Body: UpdateInteractionBody }>(
    '/interactions/:id',
    {
      preHandler: [requireAuth],
      schema: {
        body: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['voice_note', 'chat_export', 'manual_note', 'call', 'meeting'],
            },
            content: { type: 'string' },
            duration: { type: 'number' },
            occurredAt: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateInteractionBody }>,
      reply: FastifyReply
    ) => {
      const { userId } = request as AuthenticatedRequest
      const { id: interactionId } = request.params
      const data = request.body

      const existing = await prisma.interaction.findFirst({
        where: { id: interactionId, userId },
        select: { id: true },
      })

      if (!existing) {
        return reply.code(404).send({ success: false, error: '交互记录不存在' })
      }

      const updateData: Record<string, unknown> = {}
      if (data.type !== undefined) updateData.type = data.type
      if (data.content !== undefined) updateData.content = data.content
      if (data.duration !== undefined) updateData.duration = data.duration
      if (data.occurredAt !== undefined) updateData.occurredAt = new Date(data.occurredAt)

      const interaction = await prisma.interaction.update({
        where: { id: interactionId },
        data: updateData,
      })

      return { success: true, data: interaction }
    }
  )

  // DELETE /interactions/:id — delete interaction
  fastify.delete(
    '/interactions/:id',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request as AuthenticatedRequest
      const { id: interactionId } = request.params as { id: string }

      const existing = await prisma.interaction.findFirst({
        where: { id: interactionId, userId },
        select: { id: true },
      })

      if (!existing) {
        return reply.code(404).send({ success: false, error: '交互记录不存在' })
      }

      await prisma.interaction.delete({ where: { id: interactionId } })

      return { success: true }
    }
  )
}
