import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { verifyToken } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'

export interface AuthenticatedRequest extends FastifyRequest {
  userId: string
  openId?: string
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ success: false, error: '未登录' })
  }

  const token = authHeader.slice(7)

  // Dev mode: accept dev-token-h5 without JWT verification
  if (token === 'dev-token-h5') {
    await prisma.user.upsert({
      where: { id: 'dev-user' },
      update: {},
      create: {
        id: 'dev-user',
        openId: 'dev-openid',
        nickname: '开发测试用户',
      },
    })
    ;(request as AuthenticatedRequest).userId = 'dev-user'
    ;(request as AuthenticatedRequest).openId = 'dev-openid'
    return
  }

  try {
    const payload = await verifyToken(token)
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true },
    })
    if (!user) {
      return reply.code(401).send({ success: false, error: '用户登录已失效，请重新登录' })
    }
    ;(request as AuthenticatedRequest).userId = payload.sub
    ;(request as AuthenticatedRequest).openId = payload.openId
  } catch {
    return reply.code(401).send({ success: false, error: '登录已过期' })
  }
}


export async function registerProtectedRoutes(fastify: FastifyInstance) {
  // Example: protected route template
  fastify.get('/auth/me', { preHandler: [requireAuth] }, async (request) => {
    const authReq = request as AuthenticatedRequest
    const { prisma } = await import('../lib/prisma.js')
    const user = await prisma.user.findUnique({
      where: { id: authReq.userId },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        createdAt: true,
      },
    })

    return { success: true, data: user }
  })
}
