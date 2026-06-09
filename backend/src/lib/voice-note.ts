import OpenAI from 'openai'
import { env } from '../config/env.js'

const qwen = new OpenAI({
  apiKey: env.QWEN_API_KEY,
  baseURL: 'https://coding.dashscope.aliyuncs.com/v1',
})

export interface VoiceNoteExtractResult {
  contactName?: string
  company?: string
  title?: string
  interactionType: 'meeting' | 'call' | 'chat' | 'other'
  summary: string
  keyPoints: string[]
  reminder?: {
    action: string
    daysLater: number
  } | null
}

const SYSTEM_PROMPT = `你是一个专业的语音笔记解析助手。用户会通过语音记录与联系人的交互，你需要从转录文本中提取结构化信息。

提取要求：
1. 识别提到的联系人姓名、公司、职位
2. 判断交互类型（会议/通话/聊天/其他）
3. 生成简洁的交互摘要（50字内）
4. 提取关键要点（最多3个）
5. 如果有需要跟进的事项，生成提醒建议

注意事项：
- 如果某项信息不存在，返回 null 或空数组
- 保持客观，不要编造信息
- 摘要要简洁有力，抓住重点
- 提醒事项要具体可执行`

/**
 * 从语音转录文本中提取结构化信息
 */
export async function extractFromVoiceNote(transcript: string): Promise<VoiceNoteExtractResult> {
  try {
    const response = await qwen.chat.completions.create({
      model: env.QWEN_MODEL_TEXT,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `从以下语音转录文本中提取信息：

${transcript}

请严格按以下 JSON 格式返回：
{
  "contactName": "联系人姓名（如果提到）",
  "company": "公司名（如果提到）",
  "title": "职位（如果提到）",
  "interactionType": "meeting|call|chat|other",
  "summary": "交互摘要（50字内）",
  "keyPoints": ["要点1", "要点2"],
  "reminder": {
    "action": "需要跟进的事项",
    "daysLater": 21
  }
}

如果某项信息不存在，对应字段返回 null 或空数组。`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('AI 返回空内容')
    }

    // 解析 JSON，处理可能的 markdown 代码块
    let jsonStr = content.trim()
    const codeBlockMatch = jsonStr.match(/```json\n?([\s\S]*?)\n?```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr)

    return {
      contactName: parsed.contactName || undefined,
      company: parsed.company || undefined,
      title: parsed.title || undefined,
      interactionType: parsed.interactionType || 'other',
      summary: parsed.summary || '',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      reminder: parsed.reminder || null,
    }
  } catch (error) {
    console.error('extractFromVoiceNote failed:', error)
    // 降级处理：返回基本结构
    return {
      interactionType: 'other',
      summary: transcript.substring(0, 100),
      keyPoints: [],
      reminder: null,
    }
  }
}
