import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { verifyToken } from '../lib/auth.js'

export interface AuthenticatedRequest extends FastifyRequest {
  userId: string
  openId: string
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ success: false, error: '未登录' })
  }

  try {
    const token = authHeader.slice(7)
    const payload = await verifyToken(token)
    ;(request as AuthenticatedRequest).userId = payload.sub
    ;(request as AuthenticatedRequest).openId = payload.openId
  } catch {
    return reply.code(401).send({ success: false, error: '登录已过期' })
  }
}

export async function registerProtectedRoutes(fastify: FastifyInstance) {
  // Example: protected route template
  fastify.get('/auth/me', { preHandler: [requireAuth] }, async (request: AuthenticatedRequest) => {
    const { prisma } = await import('../lib/prisma.js')
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        subscriptionTier: true,
        createdAt: true,
      },
    })

    return { success: true, data: user }
  })
}
