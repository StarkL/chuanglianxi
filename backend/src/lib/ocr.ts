import OpenAI from 'openai'
import { env } from '../config/env.js'

const qwen = new OpenAI({
  apiKey: env.QWEN_API_KEY,
  baseURL: 'https://coding.dashscope.aliyuncs.com/v1',
})

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

/**
 * Recognize and extract business card information using Qwen multimodal capabilities.
 * @param imageBase64 The raw base64 string of the image
 * @returns The structured OCR data
 */
export async function recognizeBusinessCard(imageBase64: string): Promise<NormalizedOCRData> {
  try {
    const response = await qwen.chat.completions.create({
      model: env.QWEN_MODEL_VISION,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a professional assistant designed to extract structured information from business card images.
Extract the following information from the provided business card image:
- name: The name of the person (default to empty string if missing)
- company: The name of the company (default to empty string if missing)
- title: The job title or position (default to empty string if missing)
- phone: The phone or mobile number (default to empty string if missing)
- email: The email address (default to empty string if missing)
- website: The website URL (default to null if missing)
- address: The physical address (default to null if missing)
- wechatId: The WeChat ID (default to null if missing)

You MUST respond strictly with a valid JSON object matching the keys listed above. Do not include markdown code block syntax (like \`\`\`json), do not write any introductory or explanatory text. Just the JSON object.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Qwen returned empty response')
    }

    let jsonStr = content.trim()
    const codeBlockMatch = jsonStr.match(/```json\n?([\s\S]*?)\n?```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim()
    }

    const data = JSON.parse(jsonStr)
    return {
      name: data.name || '',
      company: data.company || '',
      title: data.title || '',
      phone: data.phone || '',
      email: data.email || '',
      website: data.website || null,
      address: data.address || null,
      wechatId: data.wechatId || null,
    }
  } catch (error: any) {
    throw new Error(`Qwen3.6-plus OCR recognition failed: ${error.message}`)
  }
}
