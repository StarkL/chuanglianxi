import { env } from '../config/env.js'
import { prisma } from './prisma.js'
import { getAccessToken } from './wechat-access-token.js'

interface ReminderNotificationArgs {
  userId: string
  reminder: {
    id: string
    type: string
    message: string
    scheduledAt: Date
  }
}

async function sendWeChatSubscriptionMessage(
  openId: string,
  templateId: string,
  data: Record<string, { value: string }>
): Promise<void> {
  const accessToken = await getAccessToken()

  const url = new URL('https://api.weixin.qq.com/cgi-bin/message/subscribe/send')
  url.searchParams.set('access_token', accessToken)

  const body = {
    touser: openId,
    template_id: templateId,
    page: '/pages/reminders/list',
    data,
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const result = (await response.json()) as Record<string, unknown>

  if (result.errcode) {
    const errcode = result.errcode as number
    const errmsg = result.errmsg as string
    // 43101 = user rejected, 40003 = invalid openId
    if (errcode === 43101) {
      throw new Error(`用户拒绝接收订阅消息: ${errmsg}`)
    }
    if (errcode === 40003) {
      throw new Error(`无效的 openId: ${errmsg}`)
    }
    throw new Error(`微信订阅消息发送失败: ${errcode} - ${errmsg}`)
  }
}

export async function sendReminderNotification(
  args: ReminderNotificationArgs
): Promise<boolean> {
  const { userId, reminder } = args

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { openId: true },
  })

  if (!user) {
    return false
  }

  const scheduledDate = reminder.scheduledAt
  const dateStr = `${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, '0')}-${String(scheduledDate.getDate()).padStart(2, '0')} ${String(scheduledDate.getHours()).padStart(2, '0')}:${String(scheduledDate.getMinutes()).padStart(2, '0')}`

  let templateId: string
  let messageData: Record<string, { value: string }>

  switch (reminder.type) {
    case 'relationship':
      templateId = env.WECHAT_SUBSCRIPTION_TEMPLATE_ID_RELATIONSHIP || ''
      messageData = {
        thing1: { value: '关系提醒' },
        thing2: { value: reminder.message },
        time1: { value: dateStr },
      }
      break
    case 'birthday':
      templateId = env.WECHAT_SUBSCRIPTION_TEMPLATE_ID_BIRTHDAY || ''
      messageData = {
        thing1: { value: '生日提醒' },
        thing2: { value: reminder.message },
        time1: { value: dateStr },
      }
      break
    default:
      templateId = env.WECHAT_SUBSCRIPTION_TEMPLATE_ID_CUSTOM || ''
      messageData = {
        thing1: { value: '自定义提醒' },
        thing2: { value: reminder.message },
        time1: { value: dateStr },
      }
  }

  if (!templateId) {
    return false
  }

  try {
    await sendWeChatSubscriptionMessage(user.openId, templateId, messageData)
    return true
  } catch {
    return false
  }
}
