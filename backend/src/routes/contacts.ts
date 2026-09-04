import { randomUUID } from 'node:crypto'
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
  ignoreDuplicate?: boolean
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
      where.OR = [{ name: { contains: query.search } }, { company: { contains: query.search } }]
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

    return {
      success: true,
      data: contacts.map((c: any) => ({ ...c, tags: JSON.parse(c.tags || '[]') })),
    }
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
            name: { type: 'string', minLength: 1, maxLength: 200 },
            company: { type: 'string', maxLength: 200 },
            title: { type: 'string', maxLength: 200 },
            phone: { type: 'string', maxLength: 50 },
            wechatId: { type: 'string', maxLength: 100 },
            email: { type: 'string', maxLength: 200 },
            avatar: { type: 'string', maxLength: 2000 },
            source: { type: 'string', maxLength: 200 },
            tags: { type: 'array', items: { type: 'string', maxLength: 50 } },
            ignoreDuplicate: { type: 'boolean' },
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
        ignoreDuplicate,
      } = request.body

      if (!ignoreDuplicate) {
        const existing = await prisma.contact.findFirst({
          where: { userId, name: name.trim() },
        })
        if (existing) {
          return {
            success: false,
            error: 'duplicate',
            data: {
              ...existing,
              tags: JSON.parse(existing.tags || '[]'),
            },
          }
        }
      }

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

      const { ignoreDuplicate, ...updateData } = data as any
      const contact = await prisma.contact.update({
        where: { id },
        data: {
          ...updateData,
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
            code: { type: 'string', maxLength: 500 },
            encryptedData: { type: 'string', maxLength: 10000 },
            iv: { type: 'string', maxLength: 100 },
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
          return {
            success: true,
            data: { ...existing, tags: JSON.parse(existing.tags || '[]') },
            duplicate: true,
          }
        }

        const contact = await prisma.contact.create({
          data: {
            userId,
            name,
            phone: phoneNumber,
            source: 'phone-import',
            tags: '[]',
          },
        })

        return {
          success: true,
          data: { ...contact, tags: JSON.parse(contact.tags || '[]') },
          duplicate: false,
        }
      } catch {
        return reply.code(400).send({ success: false, error: '解密失败，请重新登录' })
      }
    }
  )

  fastify.post<{
    Body: {
      contacts: Array<{
        name: string
        phone?: string
        company?: string
        title?: string
        email?: string
        wechatId?: string
        source?: string
        tags?: string[]
      }>
      defaultTag?: string
    }
  }>(
    '/contacts/batch',
    {
      preHandler: [requireAuth],
      schema: {
        body: {
          type: 'object',
          required: ['contacts'],
          properties: {
            contacts: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 200 },
                  phone: { type: 'string', maxLength: 50 },
                  company: { type: 'string', maxLength: 200 },
                  title: { type: 'string', maxLength: 200 },
                  email: { type: 'string', maxLength: 200 },
                  wechatId: { type: 'string', maxLength: 100 },
                  source: { type: 'string', maxLength: 100 },
                  tags: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            defaultTag: { type: 'string', maxLength: 100 },
          },
        },
      },
    },
    async (request, reply) => {
      const { userId } = request as AuthenticatedRequest
      const { contacts, defaultTag } = request.body

      if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        return reply.code(400).send({ success: false, error: '联系人列表不能为空' })
      }

      if (contacts.length > 1000) {
        return reply.code(400).send({ success: false, error: '单次最多导入 1000 位联系人' })
      }

      const existing = await prisma.contact.findMany({
        where: { userId },
        select: { name: true, phone: true },
      })
      const existingPhones = new Set(existing.map((c) => c.phone?.trim()).filter(Boolean))
      const existingNames = new Set(existing.map((c) => c.name.trim()))

      const toInsert: Array<{
        userId: string
        name: string
        phone: string | null
        company: string | null
        title: string | null
        email: string | null
        wechatId: string | null
        source: string
        tags: string
      }> = []
      let skipped = 0
      const seenPhonesInBatch = new Set<string>()
      const seenNamesInBatch = new Set<string>()

      for (const item of contacts) {
        const trimmedName = item.name?.trim()
        if (!trimmedName) {
          skipped++
          continue
        }

        const trimmedPhone = item.phone ? item.phone.replace(/[\s-]/g, '').trim() : undefined

        const isDuplicatePhone =
          trimmedPhone && (existingPhones.has(trimmedPhone) || seenPhonesInBatch.has(trimmedPhone))
        const isDuplicateNameNoPhone =
          !trimmedPhone && (existingNames.has(trimmedName) || seenNamesInBatch.has(trimmedName))

        if (isDuplicatePhone || isDuplicateNameNoPhone) {
          skipped++
          continue
        }

        if (trimmedPhone) seenPhonesInBatch.add(trimmedPhone)
        seenNamesInBatch.add(trimmedName)

        const tags =
          item.tags && item.tags.length > 0
            ? item.tags
            : defaultTag
              ? [defaultTag]
              : ['通讯录导入']

        toInsert.push({
          id: randomUUID(),
          userId,
          name: trimmedName,
          phone: trimmedPhone || null,
          company: item.company?.trim() || null,
          title: item.title?.trim() || null,
          email: item.email?.trim() || null,
          wechatId: item.wechatId?.trim() || null,
          source: item.source || 'batch-import',
          tags: JSON.stringify(tags),
        })
      }

      if (toInsert.length > 0) {
        try {
          await prisma.contact.createMany({
            data: toInsert,
          })
        } catch (err: any) {
          request.log.error(err)
          if (err?.code === 'P2003') {
            return reply.code(401).send({ success: false, error: '登录态已失效，请重新登录后再试' })
          }
          return reply.code(500).send({ success: false, error: '保存联系人失败，请稍后重试' })
        }
      }

      return {
        success: true,
        data: {
          total: contacts.length,
          imported: toInsert.length,
          skipped,
        },
      }
    }
  )

}

