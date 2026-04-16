import type { FastifyInstance } from 'fastify'
import { healthRoute } from './health.js'

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.register(healthRoute, { prefix: '/api' })
}
