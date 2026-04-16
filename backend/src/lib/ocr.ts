import { AipOcrClient } from 'baidu-aip-sdk'
import { env } from '../config/env.js'

const ocrClient = new AipOcrClient(
  env.BAIDU_OCR_APP_ID,
  env.BAIDU_OCR_API_KEY,
  env.BAIDU_OCR_SECRET_KEY
)

export interface NormalizedOCRData {
  name: string
  company: string
  title: string
  phone: string
  email: string
  website: string | null
  address: string | null
  wechatId: string | null
}

const KEY_MAP: Record<string, keyof NormalizedOCRData> = {
  姓名: 'name',
  公司: 'company',
  职位: 'title',
  电话: 'phone',
  邮箱: 'email',
  网址: 'website',
  地址: 'address',
}

export function normalizeBaiduBusinessCardResult(raw: unknown): NormalizedOCRData {
  const result = raw as { words_result?: Array<{ key: string; value?: string }> }
  const normalized: NormalizedOCRData = {
    name: '',
    company: '',
    title: '',
    phone: '',
    email: '',
    website: null,
    address: null,
    wechatId: null,
  }

  if (result.words_result) {
    for (const item of result.words_result) {
      const field = KEY_MAP[item.key]
      if (field && item.value) {
        ;(normalized[field] as string | null) = item.value
      }
    }
  }

  return normalized
}

export async function recognizeBusinessCard(imageBase64: string): Promise<NormalizedOCRData> {
  const result = await ocrClient.businessCard(imageBase64, {
    recognize_granularity: 'big',
  })

  if (result.error_code && result.error_code !== 0) {
    throw new Error(`Baidu OCR failed: ${result.error_msg}`)
  }

  return normalizeBaiduBusinessCardResult(result)
}
