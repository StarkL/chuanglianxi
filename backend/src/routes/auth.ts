import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { code2Session } from '../lib/wechat.js'
import { generateToken } from '../lib/auth.js'
import { hashPassword, verifyPassword } from '../lib/hash.js'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js'
import { validateNickname, validatePasswordChange } from '../lib/profile-validator.js'

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
            code: { type: 'string', maxLength: 500 },
            nickname: { type: 'string', maxLength: 200 },
            avatar: { type: 'string', maxLength: 2000 },
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

        const token = await generateToken({ sub: user.id, openId: user.openId || undefined })

        return {
          success: true,
          data: {
            token,
            user: {
              id: user.id,
              nickname: user.nickname,
              avatar: user.avatar,
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

  fastify.post<{ Body: any }>(
    '/auth/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 3, maxLength: 50 },
            password: { type: 'string', minLength: 6, maxLength: 100 },
            nickname: { type: 'string', maxLength: 200 },
            avatar: { type: 'string', maxLength: 2000 },
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
    async (request, reply) => {
      const body = request.body as any
      const { username, password, nickname, avatar } = body

      try {
        const existingUser = await prisma.user.findUnique({ where: { username } })
        if (existingUser) {
          return reply.code(400).send({ success: false, error: '用户名已存在' })
        }

        const passwordHash = hashPassword(password)
        const user = await prisma.user.create({
          data: {
            username,
            passwordHash,
            nickname: nickname || username,
            avatar: avatar || '',
          },
        })

        const token = await generateToken({ sub: user.id })

        return {
          success: true,
          data: {
            token,
            user: {
              id: user.id,
              nickname: user.nickname,
              avatar: user.avatar,
            },
          },
        }
      } catch (error: unknown) {
        const err = error as { code?: string }
        if (err?.code === 'P2002') {
          return reply.code(400).send({ success: false, error: '用户名已存在' })
        }
        if (err?.code === 'P2003') {
          return reply.code(400).send({ success: false, error: '数据关联错误，请重试' })
        }
        return reply.code(400).send({ success: false, error: '注册失败，请稍后重试' })
      }
    }
  )

  fastify.post<{ Body: any }>(
    '/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
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
    async (request, reply) => {
      const body = request.body as any
      const { username, password } = body

      try {
        const user = await prisma.user.findUnique({ where: { username } })
        if (!user || !user.passwordHash) {
          return reply.code(400).send({ success: false, error: '用户名或密码错误' })
        }

        const isVerified = verifyPassword(password, user.passwordHash)
        if (!isVerified) {
          return reply.code(400).send({ success: false, error: '用户名或密码错误' })
        }

        const token = await generateToken({ sub: user.id })

        return {
          success: true,
          data: {
            token,
            user: {
              id: user.id,
              nickname: user.nickname,
              avatar: user.avatar,
            },
          },
        }
      } catch (error: unknown) {
        return reply.code(400).send({ success: false, error: '登录失败，请稍后重试' })
      }
    }
  )

  fastify.get('/auth/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ success: false, error: '未登录' })
    }

    const token = authHeader.slice(7)

    // Dev mode: accept dev-token-h5 without verification
    if (token === 'dev-token-h5') {
      return { success: true }
    }

    try {
      const { verifyToken } = await import('../lib/auth.js')
      await verifyToken(token)
      return { success: true }
    } catch {
      return reply.code(401).send({ success: false, error: '登录已过期' })
    }
  })

  fastify.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    // Client clears local storage; server-side token blacklist can be added later
    return { success: true }
  })

  fastify.put<{ Body: any }>(
    '/auth/profile',
    {
      preHandler: [requireAuth],
      schema: {
        body: {
          type: 'object',
          properties: {
            nickname: { type: 'string', maxLength: 200 },
            oldPassword: { type: 'string' },
            newPassword: { type: 'string', maxLength: 100 },
            confirmPassword: { type: 'string', maxLength: 100 },
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
                  nickname: { type: 'string' },
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
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest
      const body = request.body as any
      const { nickname, oldPassword, newPassword, confirmPassword } = body

      try {
        const updateData: Record<string, unknown> = {}

        // 更新昵称
        if (nickname !== undefined) {
          const validation = validateNickname(nickname)
          if (!validation.valid) {
            return reply.code(400).send({ success: false, error: validation.error })
          }
          updateData.nickname = nickname.trim()
        }

        // 修改密码（仅对有密码的用户）
        if (oldPassword || newPassword || confirmPassword) {
          const user = await prisma.user.findUnique({ where: { id: authReq.userId } })
          if (!user?.passwordHash) {
            return reply.code(400).send({ success: false, error: '该账户未设置密码' })
          }

          const pwValidation = validatePasswordChange(oldPassword || '', newPassword || '', confirmPassword || '')
          if (!pwValidation.valid) {
            return reply.code(400).send({ success: false, error: pwValidation.error })
          }

          if (!verifyPassword(oldPassword, user.passwordHash)) {
            return reply.code(400).send({ success: false, error: '原密码错误' })
          }

          updateData.passwordHash = hashPassword(newPassword)
        }

        if (Object.keys(updateData).length === 0) {
          return reply.code(400).send({ success: false, error: '没有需要更新的内容' })
        }

        await prisma.user.update({ where: { id: authReq.userId }, data: updateData })

        const updated = await prisma.user.findUnique({
          where: { id: authReq.userId },
          select: { nickname: true },
        })

        return { success: true, data: { nickname: updated?.nickname } }
      } catch (error: unknown) {
        const err = error as { code?: string }
        if (err?.code === 'P2002') {
          return reply.code(400).send({ success: false, error: '昵称已被使用' })
        }
        return reply.code(400).send({ success: false, error: '更新失败，请稍后重试' })
      }
    }
  )
}
