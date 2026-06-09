import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractChatPartnerName, generateChatReplies } from './chat-replier.js'
import OpenAI from 'openai'
import { env } from '../config/env.js'

// Mock the OpenAI library
vi.mock('openai', () => {
  const mockCreate = vi.fn()
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }))
  }
})

describe('chat-replier helper', () => {
  let mockOpenAIInstance: any

  beforeEach(() => {
    vi.clearAllMocks()
    const mockOpenAI = new OpenAI({ apiKey: 'test' })
    mockOpenAIInstance = mockOpenAI
  })

  it('extractChatPartnerName should call OpenAI with correct parameters and return name', async () => {
    const mockCreate = mockOpenAIInstance.chat.completions.create
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: '李强'
          }
        }
      ]
    })

    const name = await extractChatPartnerName('base64_image_data_here')
    expect(name).toBe('李强')
    expect(mockCreate).toHaveBeenCalledTimes(1)
    
    // Check parameters passed to completions.create
    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.model).toBe(env.QWEN_MODEL_VISION)
    expect(callArgs.messages[0].content[0].text).toContain('WeChat chat screenshots')
    expect(callArgs.messages[0].content[1].image_url.url).toContain('base64_image_data_here')
  })

  it('generateChatReplies should merge CRM context and generate 3 options', async () => {
    const mockCreate = mockOpenAIInstance.chat.completions.create
    const expectedJson = {
      analysis: '对方在问候健康，建议委婉回复。',
      options: [
        { style: '委婉情商', text: '好多了，多谢关心！' },
        { style: '职场得体', text: '感谢问候，已基本恢复，可以推进工作。' },
        { style: '幽默破冰', text: '满血复活！又可以为你冒火花了！' }
      ]
    }
    
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(expectedJson)
          }
        }
      ]
    })

    const contactData = {
      name: '李强',
      company: '腾讯',
      title: '总监',
      tags: ['重要领导'],
      notes: '最近腰椎间盘突出',
      lastInteractions: [
        { type: 'manual', content: '在星巴克喝了茶，聊了身体健康。', occurredAt: new Date('2026-06-08T00:00:00.000Z') }
      ]
    }

    const result = await generateChatReplies('base64_image_data_here', contactData, '幽默点')
    
    expect(result.analysis).toBe('对方在问候健康，建议委婉回复。')
    expect(result.options).toHaveLength(3)
    expect(result.options[0].style).toBe('委婉情商')
    expect(result.options[0].text).toBe('好多了，多谢关心！')
    
    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.model).toBe(env.QWEN_MODEL_VISION)
    expect(callArgs.messages[0].content[0].text).toContain('李强')
    expect(callArgs.messages[0].content[0].text).toContain('最近腰椎间盘突出')
    expect(callArgs.messages[0].content[0].text).toContain('用户沟通偏好: 幽默点')
  })
})
