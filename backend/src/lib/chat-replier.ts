import OpenAI from 'openai'
import { env } from '../config/env.js'

const qwen = new OpenAI({
  apiKey: env.QWEN_API_KEY,
  baseURL: 'https://coding.dashscope.aliyuncs.com/v1',
})

/**
 * Extracts the WeChat nickname of the chat partner from the screenshot.
 * The nickname is typically located in the header area (top-middle or top-left) of the WeChat screen.
 */
export async function extractChatPartnerName(imageBase64: string): Promise<string> {
  try {
    const response = await qwen.chat.completions.create({
      model: env.QWEN_MODEL_VISION,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an expert at analyzing WeChat chat screenshots. 
Look at the chat window screenshot and extract the exact nickname of the chat partner (the person the user is chatting with). 
This nickname is typically written in bold/large font at the top-middle or top-left of the screen in the header.
Return ONLY the extracted nickname as a raw string. Do not write any markdown formatting, do not write explanations, just the nickname. If you cannot find it, return an empty string.`
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
      temperature: 0.1,
    })

    const name = response.choices[0]?.message?.content?.trim() || ''
    return name
  } catch (error: any) {
    console.error('extractChatPartnerName failed:', error)
    return ''
  }
}

export interface ReplyOption {
  style: string
  text: string
}

export interface ChatRepliesResult {
  analysis: string
  options: ReplyOption[]
}

/**
 * Generates 3 contextual replies based on the chat screenshot and CRM contact details.
 */
export async function generateChatReplies(
  imageBase64: string,
  contactData: {
    name: string
    company?: string | null
    title?: string | null
    tags: string[]
    notes?: string | null
    lastInteractions?: Array<{ type: string; content: string; occurredAt: Date }>
  } | null,
  userPreferences?: string
): Promise<ChatRepliesResult> {
  const contextString = contactData
    ? JSON.stringify({
        name: contactData.name,
        company: contactData.company || '未知',
        title: contactData.title || '未知',
        tags: contactData.tags,
        notes: contactData.notes || '无特殊备注',
        recentInteractions: contactData.lastInteractions?.map(i => ({
          type: i.type,
          summary: i.content.substring(0, 100),
          date: i.occurredAt.toISOString().split('T')[0]
        })) || []
      }, null, 2)
    : '无数据库人脉记录，仅根据对话语境回复。'

  const userPrefString = userPreferences ? `用户沟通偏好: ${userPreferences}` : ''

  const promptText = `You are a high-EQ communication assistant / "AI嘴替" for the user. 
Analyze the provided chat history screenshot. 

【已知联系人背景信息 (CRM Context)】:
${contextString}

【用户偏好设置】:
${userPrefString}

任务要求:
1. 识别截图中最后的对话内容，尤其是对方的最新留言、意图及情绪。
2. 结合联系人的背景资料（如果在背景资料中提到过特殊细节如身体健康、家人琐事、项目偏好，且在当前语境中合适，请融入回复中，让回复显得非常走心、独特）。
3. 给出 3 个推荐的高情商回复选项：
   - 选项 A (委婉情商): 温和、委婉、留有余地，适合维系感情、表示关怀或委婉拒绝。
   - 选项 B (职场得体): 专业、高效、严谨，适合商务洽谈、项目催办或界限声明。
   - 选项 C (幽默破冰): 风趣、幽默、打破尴尬，适合拉近距离或活跃气氛。

你必须严格以有效的 JSON 格式返回，格式如下：
{
  "analysis": "对当前对话氛围和对方意图的极简中文分析（50字内）",
  "options": [
    { "style": "委婉情商", "text": "回复话术文本A" },
    { "style": "职场得体", "text": "回复话术文本B" },
    { "style": "幽默破冰", "text": "回复话术文本C" }
  ]
}

不含 markdown 代码块格式标记 (\`\`\`json)，不含任何额外的前导或后继文本，仅返回 JSON。`

  try {
    const response = await qwen.chat.completions.create({
      model: env.QWEN_MODEL_VISION,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: promptText
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
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Qwen returned empty response for chat reply')
    }

    let jsonStr = content.trim()
    const codeBlockMatch = jsonStr.match(/```json\n?([\s\S]*?)\n?```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim()
    }

    return JSON.parse(jsonStr) as ChatRepliesResult
  } catch (error: any) {
    console.error('generateChatReplies failed:', error)
    return {
      analysis: 'AI分析话术失败，请稍后重试',
      options: [
        { style: '委婉情商', text: '抱歉，我现在脑子有点卡壳，等我组织一下语言。' },
        { style: '职场得体', text: '收到您的消息，稍后给您答复。' },
        { style: '幽默破冰', text: '这道题太难了，我的AI脑电波正在全速运算中！' }
      ]
    }
  }
}
