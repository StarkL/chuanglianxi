import OpenAI from 'openai'
import { env } from '../config/env.js'
import type { NormalizedOCRData } from './ocr.js'

const qwen = new OpenAI({
  apiKey: env.QWEN_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
})

const SYSTEM_PROMPT = `You are a professional business card information completion assistant. Based on the following OCR-extracted data, complete any missing information:
1. If company website is missing, infer from company name (do NOT fabricate URLs, return null if uncertain)
2. Infer department from title information
3. Check and correct possible OCR recognition errors
4. Only return JSON format, no extra explanation`

export async function enrichBusinessCardData(
  ocrData: NormalizedOCRData
): Promise<Partial<NormalizedOCRData>> {
  try {
    const response = await qwen.chat.completions.create({
      model: 'qwen-plus',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(ocrData) },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) return {}

    // Try parsing, strip markdown code block fences if present
    let jsonStr = content
    const codeBlockMatch = content.match(/```json\n?([\s\S]*?)\n?```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]
    }

    return JSON.parse(jsonStr) as Partial<NormalizedOCRData>
  } catch {
    // Graceful degradation: return empty object if AI fails
    return {}
  }
}
