import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  CORS_ORIGIN: z.string().default('*'),
})

export const env = envSchema.parse(process.env)

export type Env = z.infer<typeof envSchema>
