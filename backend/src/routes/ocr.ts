import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { recognizeBusinessCard } from '../lib/ocr.js'
import { enrichBusinessCardData } from '../lib/ai-enrich.js'

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

      // OCR processing: call Baidu OCR, then enrich with Qwen AI
      let ocrResult
      try {
        ocrResult = await recognizeBusinessCard(imageData)
      } catch {
        return reply.code(400).send({
          success: false,
          error: 'OCR识别失败，请重试',
        })
      }

      // AI enrichment (non-blocking)
      const enriched = await enrichBusinessCardData(ocrResult)
      const mergedOcrData = { ...ocrResult, ...enriched }

      // Save the business card record
      const card = await prisma.businessCard.create({
        data: {
          userId,
          imageUrl: '',
          ocrData: mergedOcrData as unknown as Record<string, unknown>,
        },
      })

      return {
        success: true,
        data: {
          cardId: card.id,
          ocr: mergedOcrData,
        },
      }
    }
  )

  fastify.get('/business-cards', { preHandler: [requireAuth] }, async (request: FastifyRequest) => {
    const { userId } = request as AuthenticatedRequest

    const cards = await prisma.businessCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        imageUrl: true,
        ocrData: true,
        createdAt: true,
      },
    })

    return { success: true, data: cards }
  })

  fastify.get('/business-cards/:id', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request as AuthenticatedRequest
    const { id } = request.params as { id: string }

    const card = await prisma.businessCard.findFirst({
      where: { id, userId },
      select: { id: true, imageUrl: true, ocrData: true, createdAt: true },
    })

    if (!card) {
      return reply.code(404).send({ success: false, error: '名片不存在' })
    }

    return { success: true, data: card }
  })

  fastify.delete('/business-cards/:id', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request as AuthenticatedRequest
    const { id } = request.params as { id: string }

    const existing = await prisma.businessCard.findFirst({
      where: { id, userId },
      select: { id: true },
    })

    if (!existing) {
      return reply.code(404).send({ success: false, error: '名片不存在' })
    }

    await prisma.businessCard.delete({ where: { id } })
    return { success: true }
  })
}
