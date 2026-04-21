import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './config/env.js'
import { corsOptions } from './config/cors.js'
import { registerRoutes } from './routes/index.js'
import { startScheduler, stopScheduler } from './lib/scheduler.js'

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

    // Start the reminder scheduler
    await startScheduler(app)

    // Warn if subscription template IDs are not configured
    if (!env.WECHAT_SUBSCRIPTION_TEMPLATE_ID_RELATIONSHIP) {
      app.log.warn(
        'WECHAT_SUBSCRIPTION_TEMPLATE_ID_RELATIONSHIP not configured — relationship notifications will be skipped'
      )
    }
    if (!env.WECHAT_SUBSCRIPTION_TEMPLATE_ID_BIRTHDAY) {
      app.log.warn(
        'WECHAT_SUBSCRIPTION_TEMPLATE_ID_BIRTHDAY not configured — birthday notifications will be skipped'
      )
    }
    if (!env.WECHAT_SUBSCRIPTION_TEMPLATE_ID_CUSTOM) {
      app.log.warn(
        'WECHAT_SUBSCRIPTION_TEMPLATE_ID_CUSTOM not configured — custom notifications will be skipped'
      )
    }
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

process.on('SIGTERM', async () => {
  app.log.info('SIGTERM received, shutting down gracefully')
  stopScheduler()
  await app.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  app.log.info('SIGINT received, shutting down gracefully')
  stopScheduler()
  await app.close()
  process.exit(0)
})

await start()
