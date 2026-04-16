import type { FastifyInstance } from 'fastify'
import { healthRoute } from './health.js'
import { authRoutes } from './auth.js'
import { registerProtectedRoutes } from '../middleware/auth.js'

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.register(healthRoute, { prefix: '/api' })
  fastify.register(authRoutes, { prefix: '/api' })
  fastify.register(registerProtectedRoutes, { prefix: '/api' })
}
