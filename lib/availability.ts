import { prisma } from './prisma'
import { addDaysToDateString, instantAt, spDateString, weekdayOf } from './spdate'
import { slotOccupiedWhere } from './appointment-status'

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
      // slotHeldAt (not status) is the source of truth for "is this time taken" — it's null
      // the moment a booking is cancelled, freeing the slot immediately.
      slotHeldAt: { not: null, gte: now, lte: searchWindowEnd },
      // …but an unconfirmed booking only holds its slot until the deadline. Past it the slot
      // is bookable again with nothing having to run — the expiry is derived here, and the
      // booking route clears the stale row inside its transaction before inserting.
      ...slotOccupiedWhere(now),
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
    const seen = new Set<number>()
    for (const rule of dayRules) {
      const end = instantAt(dateStr, rule.endTime)
      const step = rule.slotMinutes * 60 * 1000
      let cursor = instantAt(dateStr, rule.startTime)
      // The whole slot must fit inside the block — a slot that merely *starts* before the
      // block ends would spill into the next block and allow overlapping bookings.
      while (cursor.getTime() + step <= end.getTime()) {
        if (cursor.getTime() > now.getTime() && !bookedTimes.has(cursor.getTime()) && !seen.has(cursor.getTime())) {
          seen.add(cursor.getTime())
          times.push(new Date(cursor))
        }
        cursor = new Date(cursor.getTime() + step)
      }
    }
    times.sort((a, b) => a.getTime() - b.getTime())
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
