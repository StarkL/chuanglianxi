import { prisma } from './prisma.js'

const THRESHOLDS = [30, 60, 90]

interface RelationshipCheckResult {
  contactId: string
  days: number
  level: number
}

export async function checkRelationshipReminders(): Promise<RelationshipCheckResult[]> {
  const contacts = await prisma.contact.findMany({
    select: {
      id: true,
      name: true,
      userId: true,
    },
  })

  const results: RelationshipCheckResult[] = []

  for (const contact of contacts) {
    const lastInteraction = await prisma.interaction.findFirst({
      where: { contactId: contact.id },
      orderBy: { occurredAt: 'desc' },
      select: { occurredAt: true },
    })

    if (!lastInteraction) continue

    const days = Math.floor(
      (Date.now() - lastInteraction.occurredAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    for (const threshold of THRESHOLDS) {
      if (days >= threshold && days < threshold + 7) {
        // Only trigger within a 7-day window after threshold
        results.push({
          contactId: contact.id,
          days,
          level: THRESHOLDS.indexOf(threshold) + 1,
        })
      }
    }
  }

  return results
}

export function getRelationshipMessage(name: string, days: number, level: number): string {
  const messages: Record<number, string> = {
    1: `你已经 30 天没联系 ${name} 了`,
    2: `你已经 60 天没联系 ${name} 了，关系可能正在变淡`,
    3: `你已经 90 天没联系 ${name} 了，该问候一下了`,
  }
  return messages[level] || `你已经 ${days} 天没联系 ${name} 了`
}
