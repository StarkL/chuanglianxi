import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

interface OcrRequestBody {
  imageData: string
}

export async function ocrRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: OcrRequestBody }>(
    '/ocr/business-card',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest<{ Body: OcrRequestBody }>, reply: FastifyReply) => {
      const { userId } = request as AuthenticatedRequest
      const { imageData } = request.body

      // Check user subscription tier for daily OCR limit
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, subscriptionTier: true },
      })

      if (user?.subscriptionTier === 'free') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const todayCount = await prisma.businessCard.count({
          where: {
            userId,
            createdAt: { gte: today, lt: tomorrow },
          },
        })

        if (todayCount >= 10) {
          return reply.code(429).send({
            success: false,
            error: '今日OCR次数已用完，升级专业版即可无限使用',
          })
        }
      }

      // OCR processing placeholder
      // In production: call Baidu OCR or WeChat OCR API with imageData
      // For now: return mock data for development
      const ocrResult = {
        name: '',
        company: '',
        title: '',
        phone: '',
        email: '',
        wechatId: '',
      }

      // Save the business card record
      const card = await prisma.businessCard.create({
        data: {
          userId,
          imageUrl: '',
          ocrData: ocrResult as unknown as Record<string, unknown>,
        },
      })

      return {
        success: true,
        data: {
          cardId: card.id,
          ocr: ocrResult,
        },
      }
    },
  )

  fastify.get(
    '/ocr/usage',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest) => {
      const { userId } = request as AuthenticatedRequest

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todayCount = await prisma.businessCard.count({
        where: {
          userId,
          createdAt: { gte: today, lt: tomorrow },
        },
      })

      return {
        success: true,
        data: {
          used: todayCount,
          limit: 10,
          remaining: Math.max(0, 10 - todayCount),
        },
      }
    },
  )

  fastify.get(
    '/business-cards',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest) => {
      const { userId } = request as AuthenticatedRequest

      const cards = await prisma.businessCard.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          imageUrl: true,
          createdAt: true,
        },
      })

      return { success: true, data: cards }
    },
  )
}
