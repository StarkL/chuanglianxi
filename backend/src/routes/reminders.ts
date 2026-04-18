import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

interface CreateReminderBody {
  contactId?: string
  type: 'relationship' | 'birthday' | 'custom'
  message: string
  scheduledAt: string
  recurrenceRule?: string
}

interface UpdateReminderBody {
  message?: string
  scheduledAt?: string
  recurrenceRule?: string
}

export async function reminderRoutes(fastify: FastifyInstance) {
  // GET /reminders — list all user reminders
  fastify.get(
    '/reminders',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest) => {
      const { userId } = request as AuthenticatedRequest
      const query = request.query as Record<string, string | undefined>

      const where: Record<string, unknown> = { userId }

      if (query.type) {
        where.type = query.type
      }
      if (query.contactId) {
        where.contactId = query.contactId
      }

      const reminders = await prisma.reminder.findMany({
        where,
        include: {
          contact: {
            select: { id: true, name: true },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      })

      return { success: true, data: reminders }
    }
  )

  // GET /reminders/pending — list unsent reminders
  fastify.get(
    '/reminders/pending',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest) => {
      const { userId } = request as AuthenticatedRequest

      const reminders = await prisma.reminder.findMany({
        where: {
          userId,
          sentAt: null,
        },
        include: {
          contact: {
            select: { id: true, name: true },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      })

      return { success: true, data: reminders }
    }
  )

  // POST /reminders — create custom reminder
  fastify.post<{ Body: CreateReminderBody }>(
    '/reminders',
    {
      preHandler: [requireAuth],
      schema: {
        body: {
          type: 'object',
          required: ['type', 'message', 'scheduledAt'],
          properties: {
            contactId: { type: 'string' },
            type: {
              type: 'string',
              enum: ['relationship', 'birthday', 'custom'],
            },
            message: { type: 'string', minLength: 1 },
            scheduledAt: { type: 'string' },
            recurrenceRule: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateReminderBody }>, reply: FastifyReply) => {
      const { userId } = request as AuthenticatedRequest
      const { contactId, type, message, scheduledAt, recurrenceRule } = request.body

      // Verify contact ownership if contactId provided
      if (contactId) {
        const contact = await prisma.contact.findFirst({
          where: { id: contactId, userId },
          select: { id: true },
        })
        if (!contact) {
          return reply.code(404).send({ success: false, error: '联系人不存在' })
        }
      }

      const reminder = await prisma.reminder.create({
        data: {
          userId,
          contactId: contactId || null,
          type,
          message,
          scheduledAt: new Date(scheduledAt),
          recurrenceRule,
        },
      })

      return { success: true, data: reminder }
    }
  )

  // PUT /reminders/:id — update reminder
  fastify.put<{ Params: { id: string }; Body: UpdateReminderBody }>(
    '/reminders/:id',
    {
      preHandler: [requireAuth],
      schema: {
        body: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            scheduledAt: { type: 'string' },
            recurrenceRule: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateReminderBody }>,
      reply: FastifyReply
    ) => {
      const { userId } = request as AuthenticatedRequest
      const { id } = request.params
      const data = request.body

      const existing = await prisma.reminder.findFirst({
        where: { id, userId },
        select: { id: true, sentAt: true },
      })

      if (!existing) {
        return reply.code(404).send({ success: false, error: '提醒不存在' })
      }

      if (existing.sentAt) {
        return reply.code(400).send({ success: false, error: '已发送的提醒不可修改' })
      }

      const updateData: Record<string, unknown> = {}
      if (data.message !== undefined) updateData.message = data.message
      if (data.scheduledAt !== undefined) updateData.scheduledAt = new Date(data.scheduledAt)
      if (data.recurrenceRule !== undefined) updateData.recurrenceRule = data.recurrenceRule

      const reminder = await prisma.reminder.update({
        where: { id },
        data: updateData,
      })

      return { success: true, data: reminder }
    }
  )

  // DELETE /reminders/:id — delete reminder
  fastify.delete(
    '/reminders/:id',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request as AuthenticatedRequest
      const { id } = request.params as { id: string }

      const existing = await prisma.reminder.findFirst({
        where: { id, userId },
        select: { id: true },
      })

      if (!existing) {
        return reply.code(404).send({ success: false, error: '提醒不存在' })
      }

      await prisma.reminder.delete({ where: { id } })

      return { success: true }
    }
  )
}
