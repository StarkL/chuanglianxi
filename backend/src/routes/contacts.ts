import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { code2Session } from '../lib/wechat.js'
import { decryptWeChatContact } from '../lib/wechat-crypto.js'

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
  birthdayType?: 'solar' | 'lunar'
  birthday?: string
  lunarMonth?: number
  lunarDay?: number
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
  birthdayType?: 'solar' | 'lunar'
  birthday?: string
  lunarMonth?: number
  lunarDay?: number
}

interface ImportPhoneBody {
  code: string
  encryptedData: string
  iv: string
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
      where.tags = { contains: `"${query.tag}"` }
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

    return { success: true, data: contacts.map(c => ({ ...c, tags: JSON.parse(c.tags || '[]') })) }
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
          reminders: {
            where: { sentAt: null },
            orderBy: { scheduledAt: 'asc' },
            select: {
              id: true,
              type: true,
              message: true,
              scheduledAt: true,
            },
          },
        },
      })

      if (!contact) {
        return reply.code(404).send({ success: false, error: '联系人不存在' })
      }

      return { success: true, data: { ...contact, tags: JSON.parse(contact.tags || '[]') } }
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
      const {
        name,
        company,
        title,
        phone,
        wechatId,
        email,
        avatar,
        source,
        tags,
        birthdayType,
        birthday,
        lunarMonth,
        lunarDay,
      } = request.body

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
          tags: JSON.stringify(tags ?? []),
          birthdayType,
          birthday: birthday ? new Date(birthday) : undefined,
          lunarMonth,
          lunarDay,
        },
      })

      return { success: true, data: { ...contact, tags: JSON.parse(contact.tags || '[]') } }
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
        data: {
          ...data,
          tags: data.tags !== undefined ? JSON.stringify(data.tags) : undefined,
          birthday: data.birthday ? new Date(data.birthday) : undefined,
        },
      })

      return { success: true, data: { ...contact, tags: JSON.parse(contact.tags || '[]') } }
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

  // POST /contacts/import-from-phone — import contact from wx.chooseContact
  fastify.post<{ Body: ImportPhoneBody }>(
    '/contacts/import-from-phone',
    {
      preHandler: [requireAuth],
      schema: {
        body: {
          type: 'object',
          required: ['code', 'encryptedData', 'iv'],
          properties: {
            code: { type: 'string' },
            encryptedData: { type: 'string' },
            iv: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ImportPhoneBody }>, reply: FastifyReply) => {
      const { userId } = request as AuthenticatedRequest
      const { code, encryptedData, iv } = request.body

      try {
        const { sessionKey } = await code2Session(code)
        const { name, phoneNumber } = decryptWeChatContact(sessionKey, iv, encryptedData)

        const existing = await prisma.contact.findFirst({
          where: { userId, phone: phoneNumber },
        })

        if (existing) {
          return { success: true, data: { ...existing, tags: JSON.parse(existing.tags || '[]') }, duplicate: true }
        }

        const contact = await prisma.contact.create({
          data: {
            userId,
            name,
            phone: phoneNumber,
            source: 'phone-import',
            tags: "[]",
          },
        })

        return { success: true, data: { ...contact, tags: JSON.parse(contact.tags || '[]') }, duplicate: false }
      } catch {
        return reply.code(400).send({ success: false, error: '解密失败，请重新登录' })
      }
    }
  )
}
