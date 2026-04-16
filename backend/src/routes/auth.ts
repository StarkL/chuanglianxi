import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { code2Session } from '../lib/wechat.js'
import { generateToken } from '../lib/auth.js'

interface WechatLoginBody {
  code: string
  nickname?: string
  avatar?: string
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: WechatLoginBody }>(
    '/auth/wechat-login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string' },
            nickname: { type: 'string' },
            avatar: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      nickname: { type: 'string' },
                      avatar: { type: 'string' },
                      subscriptionTier: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: WechatLoginBody }>, reply: FastifyReply) => {
      const { code, nickname, avatar } = request.body

      try {
        const { openId } = await code2Session(code)

        let user = await prisma.user.findUnique({ where: { openId } })

        if (!user) {
          user = await prisma.user.create({
            data: {
              openId,
              nickname,
              avatar,
            },
          })
        } else if (nickname || avatar) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              ...(nickname && { nickname }),
              ...(avatar && { avatar }),
            },
          })
        }

        const token = await generateToken({ sub: user.id, openId: user.openId })

        return {
          success: true,
          data: {
            token,
            user: {
              id: user.id,
              nickname: user.nickname,
              avatar: user.avatar,
              subscriptionTier: user.subscriptionTier,
            },
          },
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return reply.code(400).send({
          success: false,
          error: message.includes('code2Session') ? '微信授权失败' : '登录失败，请重试',
        })
      }
    }
  )

  fastify.get('/auth/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ success: false, error: '未登录' })
    }

    try {
      const { verifyToken } = await import('../lib/auth.js')
      await verifyToken(authHeader.slice(7))
      return { success: true }
    } catch {
      return reply.code(401).send({ success: false, error: '登录已过期' })
    }
  })

  fastify.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    // Client clears local storage; server-side token blacklist can be added later
    return { success: true }
  })
}
