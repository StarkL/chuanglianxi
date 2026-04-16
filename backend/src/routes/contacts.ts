import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

interface CreateContactBody {
  name: string
  company?: string
  title?: string
  phone?: string
  wechatId?: string
  email?: string
  avatar?: string
  source?: string
  tags?: string[]
}

interface UpdateContactBody {
  name?: string
  company?: string
  title?: string
  phone?: string
  wechatId?: string
  email?: string
  avatar?: string
  source?: string
  tags?: string[]
}

export async function contactRoutes(fastify: FastifyInstance) {
  fastify.get('/contacts', { preHandler: [requireAuth] }, async (request: FastifyRequest) => {
    const { userId } = request as AuthenticatedRequest
    const query = request.query as Record<string, string | undefined>

    const where: Record<string, unknown> = { userId }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { company: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    if (query.tag) {
      where.tags = { has: query.tag }
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        company: true,
        title: true,
        phone: true,
        email: true,
        avatar: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return { success: true, data: contacts }
  })

  fastify.get(
    '/contacts/:id',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request as AuthenticatedRequest
      const { id } = request.params as { id: string }

      const contact = await prisma.contact.findFirst({
        where: { id, userId },
        include: {
          interactions: {
            orderBy: { occurredAt: 'desc' },
            select: {
              id: true,
              type: true,
              content: true,
              duration: true,
              occurredAt: true,
            },
          },
        },
      })

      if (!contact) {
        return reply.code(404).send({ success: false, error: '联系人不存在' })
      }

      return { success: true, data: contact }
    }
  )

  fastify.post<{ Body: CreateContactBody }>(
    '/contacts',
    {
      preHandler: [requireAuth],
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1 },
            company: { type: 'string' },
            title: { type: 'string' },
            phone: { type: 'string' },
            wechatId: { type: 'string' },
            email: { type: 'string' },
            avatar: { type: 'string' },
            source: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateContactBody }>) => {
      const { userId } = request as AuthenticatedRequest
      const { name, company, title, phone, wechatId, email, avatar, source, tags } = request.body

      const contact = await prisma.contact.create({
        data: {
          userId,
          name,
          company,
          title,
          phone,
          wechatId,
          email,
          avatar,
          source,
          tags: tags ?? [],
        },
      })

      return { success: true, data: contact }
    }
  )

  fastify.put<{ Params: { id: string }; Body: UpdateContactBody }>(
    '/contacts/:id',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request as AuthenticatedRequest
      const { id } = request.params as { id: string }
      const data = request.body as UpdateContactBody

      const existing = await prisma.contact.findFirst({
        where: { id, userId },
        select: { id: true },
      })

      if (!existing) {
        return reply.code(404).send({ success: false, error: '联系人不存在' })
      }

      const contact = await prisma.contact.update({
        where: { id },
        data,
      })

      return { success: true, data: contact }
    }
  )

  fastify.delete(
    '/contacts/:id',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request as AuthenticatedRequest
      const { id } = request.params as { id: string }

      const existing = await prisma.contact.findFirst({
        where: { id, userId },
        select: { id: true },
      })

      if (!existing) {
        return reply.code(404).send({ success: false, error: '联系人不存在' })
      }

      await prisma.contact.delete({ where: { id } })

      return { success: true }
    }
  )
}
