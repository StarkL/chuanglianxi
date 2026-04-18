import type { FastifyInstance } from 'fastify'
import { healthRoute } from './health.js'
import { authRoutes } from './auth.js'
import { contactRoutes } from './contacts.js'
import { interactionRoutes } from './interactions.js'
import { ocrRoutes } from './ocr.js'
import { reminderRoutes } from './reminders.js'
import { registerProtectedRoutes } from '../middleware/auth.js'

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.register(healthRoute, { prefix: '/api' })
  fastify.register(authRoutes, { prefix: '/api' })
  fastify.register(contactRoutes, { prefix: '/api' })
  fastify.register(interactionRoutes, { prefix: '/api' })
  fastify.register(ocrRoutes, { prefix: '/api' })
  fastify.register(reminderRoutes, { prefix: '/api' })
  fastify.register(registerProtectedRoutes, { prefix: '/api' })
}
