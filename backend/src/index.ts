import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './config/env.js'
import { corsOptions } from './config/cors.js'
import { registerRoutes } from './routes/index.js'

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
})

await app.register(cors, corsOptions)
await registerRoutes(app)

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    app.log.info(`Server running on http://localhost:${env.PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

process.on('SIGTERM', async () => {
  app.log.info('SIGTERM received, shutting down gracefully')
  await app.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  app.log.info('SIGINT received, shutting down gracefully')
  await app.close()
  process.exit(0)
})

await start()
