import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  CORS_ORIGIN: z.string().default('*'),
  WECHAT_APP_ID: z.string().min(1),
  WECHAT_APP_SECRET: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  BAIDU_OCR_APP_ID: z.string().min(1),
  BAIDU_OCR_API_KEY: z.string().min(1),
  BAIDU_OCR_SECRET_KEY: z.string().min(1),
  QWEN_API_KEY: z.string().min(1),
  WECHAT_SUBSCRIPTION_TEMPLATE_ID_RELATIONSHIP: z.string().default(''),
  WECHAT_SUBSCRIPTION_TEMPLATE_ID_BIRTHDAY: z.string().default(''),
  WECHAT_SUBSCRIPTION_TEMPLATE_ID_CUSTOM: z.string().default(''),
})

export const env = envSchema.parse(process.env)

export type Env = z.infer<typeof envSchema>
