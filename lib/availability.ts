import { prisma } from './prisma'
import { addDaysToDateString, instantAt, spDateString, weekdayOf } from './spdate'

export interface AvailableDay {
  dateStr: string
  date: Date
  times: Date[]
}

export async function getAvailableSlots(professionalId: string, daysWanted = 5): Promise<AvailableDay[]> {
  const rules = await prisma.availabilityRule.findMany({ where: { professionalId } })
  if (rules.length === 0) return []

  const now = new Date()
  const todayStr = spDateString(now)
  const searchWindowEnd = instantAt(addDaysToDateString(todayStr, 21), '23:59')

  const existing = await prisma.appointment.findMany({
    where: {
      professionalId,
      status: 'CONFIRMED',
      scheduledAt: { gte: now, lte: searchWindowEnd },
    },
    select: { scheduledAt: true },
  })
  const bookedTimes = new Set(existing.map((a) => a.scheduledAt.getTime()))

  const result: AvailableDay[] = []
  for (let offset = 0; result.length < daysWanted && offset < 21; offset++) {
    const dateStr = addDaysToDateString(todayStr, offset)
    const dayRules = rules.filter((r) => r.weekday === weekdayOf(dateStr))
    if (dayRules.length === 0) continue

    const times: Date[] = []
    for (const rule of dayRules) {
      const end = instantAt(dateStr, rule.endTime)
      let cursor = instantAt(dateStr, rule.startTime)
      while (cursor.getTime() < end.getTime()) {
        if (cursor.getTime() > now.getTime() && !bookedTimes.has(cursor.getTime())) {
          times.push(new Date(cursor))
        }
        cursor = new Date(cursor.getTime() + rule.slotMinutes * 60 * 1000)
      }
    }
    if (times.length > 0) {
      result.push({ dateStr, date: instantAt(dateStr, '00:00'), times })
    }
  }
  return result
}

export async function isSlotAvailable(professionalId: string, scheduledAt: Date) {
  const days = await getAvailableSlots(professionalId, 21)
  return days.some((day) => day.times.some((t) => t.getTime() === scheduledAt.getTime()))
}
