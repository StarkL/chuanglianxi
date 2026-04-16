import type { FastifyCorsOptions } from '@fastify/cors'
import { env } from './env.js'

export const corsOptions: FastifyCorsOptions = {
  origin: env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}
