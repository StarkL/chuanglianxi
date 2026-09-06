/**
 * 本地离线结构化信息提取器 (Local-First Offline Extractor)
 * 纯端侧正则与启发式语法分析：
 * 1. 自动匹配现有联系人姓名 (模糊与全称匹配)
 * 2. 交互类型判定 (会议 meeting / 电话 call / 微信 chat / 其他 other)
 * 3. 提取核心摘要 (Summary) 与关键要点 (Key Points)
 * 4. 识别自然语言时间与待办提醒动作 (如 "明天", "3天后", "下周", "记得提醒我...")
 */

import type { VoiceNoteExtractResult } from '../../api/voice-note'
import type { Contact } from '../../api/contacts'

export function extractVoiceNoteLocally(
  transcript: string,
  contacts: Contact[] = []
): VoiceNoteExtractResult {
  const text = transcript.trim()

  // 1. 尝试在现有联系人列表中寻找姓名
  let matchedContactName = ''
  for (const c of contacts) {
    if (c.name && text.includes(c.name)) {
      matchedContactName = c.name
      break
    }
  }

  // 若未匹配到，尝试用称谓模式提取 (如 "和王总", "跟张三", "与李经理")
  if (!matchedContactName) {
    const nameMatch = text.match(/(?:和|跟|与|同|对|找)([\u4e00-\u9fa5]{2,4}?)(?:总|经理|老板|老师|哥|姐|谈|聊|开会|商量|沟通|约)/)
    if (nameMatch && nameMatch[1]) {
      matchedContactName = nameMatch[1]
    }
  }

  // 2. 交互类型推断
  let interactionType: 'meeting' | 'call' | 'chat' | 'other' = 'other'
  if (/面谈|见面|开会|拜访|聚餐|咖啡|吃饭|讨论|当面|会议/.test(text)) {
    interactionType = 'meeting'
  } else if (/电话|拨打|通话|语音通话|致电|打了电话/.test(text)) {
    interactionType = 'call'
  } else if (/微信|发消息|发了微信|群聊|私信|发邮件|沟通/.test(text)) {
    interactionType = 'chat'
  }

  // 3. 待办提醒识别 (提取动作与天数)
  let reminder: { action: string; daysLater: number } | null = null
  let daysLater = 1
  if (/明天|次日/.test(text)) {
    daysLater = 1
  } else if (/后天/.test(text)) {
    daysLater = 2
  } else if (/大后天|3天后|三天后/.test(text)) {
    daysLater = 3
  } else if (/下周/.test(text)) {
    daysLater = 7
  } else if (/两周后|半个月/.test(text)) {
    daysLater = 14
  } else if (/下个月|1个月后/.test(text)) {
    daysLater = 30
  }

  const reminderMatch = text.match(/(?:提醒我|记得|需要|要|打算|安排|别忘了)([^。！？]+)/)
  if (reminderMatch && reminderMatch[1]) {
    reminder = {
      action: reminderMatch[1].trim(),
      daysLater
    }
  } else if (/明天|后天|下周|待办|后续/.test(text)) {
    reminder = {
      action: '跟进落实本次沟通要点',
      daysLater
    }
  }

  // 4. 关键要点分句提取
  const sentences = text
    .split(/[，。！？；\n]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 4)

  const keyPoints: string[] = []
  for (const sentence of sentences) {
    if (keyPoints.length < 3) {
      keyPoints.push(sentence)
    }
  }

  // 5. 生成精炼摘要
  let summary = text
  if (sentences.length > 0) {
    summary = sentences.slice(0, 2).join('，')
    if (!/[。！？]$/.test(summary)) summary += '。'
  }

  return {
    contactName: matchedContactName || undefined,
    interactionType,
    summary,
    keyPoints: keyPoints.length > 0 ? keyPoints : [text],
    reminder
  }
}
