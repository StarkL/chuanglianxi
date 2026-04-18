import type { FastifyInstance } from 'fastify'
import * as schedule from 'node-schedule'
import { prisma } from './prisma.js'
import { sendReminderNotification } from './notification.js'
import { checkRelationshipReminders, getRelationshipMessage } from './relationship-rules.js'

let scheduledJobs: schedule.Job[] = []

export async function startScheduler(fastify: FastifyInstance): Promise<void> {
  fastify.log.info('Starting reminder scheduler...')

  // Main reminder check — runs every 15 minutes
  const reminderJob = schedule.scheduleJob('*/15 * * * *', async () => {
    fastify.log.info('Running reminder check...')
    await processDueReminders(fastify)
    await processRelationshipReminders(fastify)
    await processBirthdayReminders(fastify)
  })

  scheduledJobs.push(reminderJob)
  fastify.log.info('Reminder scheduler started — checking every 15 minutes')
}

async function processDueReminders(fastify: FastifyInstance): Promise<void> {
  const now = new Date()

  const dueReminders = await prisma.reminder.findMany({
    where: {
      scheduledAt: { lte: now },
      sentAt: null,
    },
    include: {
      contact: {
        select: { name: true },
      },
    },
  })

  fastify.log.info(`Found ${dueReminders.length} due reminders`)

  for (const reminder of dueReminders) {
    try {
      const success = await sendReminderNotification({
        userId: reminder.userId,
        reminder: {
          id: reminder.id,
          type: reminder.type,
          message: reminder.message,
          scheduledAt: reminder.scheduledAt,
        },
      })

      if (success) {
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { sentAt: new Date() },
        })
        fastify.log.info(`Reminder ${reminder.id} sent successfully`)

        // Create next instance for recurring reminders
        if (reminder.recurrenceRule) {
          await createNextRecurringReminder(reminder, fastify)
        }
      } else {
        fastify.log.warn(`Failed to send reminder ${reminder.id}`)
      }
    } catch (error) {
      fastify.log.error(
        `Error processing reminder ${reminder.id}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}

async function processRelationshipReminders(fastify: FastifyInstance): Promise<void> {
  try {
    const results = await checkRelationshipReminders()

    for (const result of results) {
      // Check if a reminder already exists for this contact+threshold window
      const existingReminder = await prisma.reminder.findFirst({
        where: {
          contactId: result.contactId,
          type: 'relationship',
          sentAt: null,
          scheduledAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // within last 7 days
          },
        },
      })

      if (existingReminder) continue

      const contact = await prisma.contact.findUnique({
        where: { id: result.contactId },
        select: { name: true, userId: true },
      })

      if (!contact) continue

      const message = getRelationshipMessage(contact.name, result.days, result.level)

      await prisma.reminder.create({
        data: {
          userId: contact.userId,
          contactId: result.contactId,
          type: 'relationship',
          message,
          scheduledAt: new Date(),
        },
      })

      fastify.log.info(
        `Created relationship reminder for ${contact.name} — ${result.days} days, level ${result.level}`
      )
    }
  } catch (error) {
    fastify.log.error(
      `Error processing relationship reminders: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

async function processBirthdayReminders(fastify: FastifyInstance): Promise<void> {
  try {
    // Find contacts with lunar birthdays
    const lunarContacts = await prisma.contact.findMany({
      where: {
        lunarMonth: { not: null },
        lunarDay: { not: null },
      },
      select: {
        id: true,
        name: true,
        userId: true,
        lunarMonth: true,
        lunarDay: true,
      },
    })

    const now = new Date()
    const daysAhead = 3 // remind 3 days before birthday

    for (const contact of lunarContacts) {
      if (!contact.lunarMonth || !contact.lunarDay) continue

      // For V1, we use the stored birthday field for solar date comparison
      // A full lunar-to-solar conversion would require lunar-javascript library
      // For now, use the birthday field if set
      if (!contact.birthday) continue

      const birthdayDate = new Date(contact.birthday)
      // Set to current year
      birthdayDate.setFullYear(now.getFullYear())

      const daysUntil = Math.floor(
        (birthdayDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysUntil >= 0 && daysUntil <= daysAhead) {
        // Check if reminder already exists
        const existingReminder = await prisma.reminder.findFirst({
          where: {
            contactId: contact.id,
            type: 'birthday',
            sentAt: null,
            scheduledAt: {
              gte: now,
            },
          },
        })

        if (existingReminder) continue

        await prisma.reminder.create({
          data: {
            userId: contact.userId,
            contactId: contact.id,
            type: 'birthday',
            message: `${contact.name} 的生日快到了`,
            scheduledAt: birthdayDate,
          },
        })

        fastify.log.info(`Created birthday reminder for ${contact.name}`)
      }
    }
  } catch (error) {
    fastify.log.error(
      `Error processing birthday reminders: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

async function createNextRecurringReminder(
  reminder: { id: string; recurrenceRule: string | null; scheduledAt: Date },
  fastify: FastifyInstance
): Promise<void> {
  if (!reminder.recurrenceRule) return

  const current = new Date(reminder.scheduledAt)
  let nextDate: Date

  switch (reminder.recurrenceRule) {
    case 'daily':
      nextDate = new Date(current.getTime() + 24 * 60 * 60 * 1000)
      break
    case 'weekly':
      nextDate = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000)
      break
    case 'monthly':
      nextDate = new Date(current)
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
    case 'yearly':
      nextDate = new Date(current)
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      break
    default:
      return
  }

  const existing = await prisma.reminder.findFirst({
    where: {
      contactId: reminder.id ? undefined : undefined,
      scheduledAt: { gte: nextDate },
      type: reminder.type,
      sentAt: null,
    },
  })

  if (existing) return

  // Get original reminder data
  const original = await prisma.reminder.findUnique({
    where: { id: reminder.id },
    select: { userId: true, contactId: true, message: true, type: true },
  })

  if (!original) return

  await prisma.reminder.create({
    data: {
      userId: original.userId,
      contactId: original.contactId,
      type: original.type,
      message: original.message,
      scheduledAt: nextDate,
      recurrenceRule: reminder.recurrenceRule,
    },
  })

  fastify.log.info(`Created recurring reminder for ${nextDate.toISOString()}`)
}

export function stopScheduler(): void {
  for (const job of scheduledJobs) {
    job.cancel()
  }
  scheduledJobs = []
}
