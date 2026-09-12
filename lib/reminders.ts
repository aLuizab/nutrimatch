import { prisma } from './prisma'
import { sendEmail } from './email'
import {
  appointmentReminderPatient,
  appointmentReminderProfessional,
  confirmationNudge,
  type AppointmentEmailData,
} from './email-templates'
import { formatDateBR, formatPrice, formatTimeBR, modalityLabel } from './format'
import { meetingUrl } from './meeting'

// The scheduled side of notifications. Everything else in lib/notifications.ts fires from a
// user action; these fire from the passage of time, which is the part that needs a scheduler
// and, more importantly, needs to be safe to run twice.
//
// Idempotency lives in the SentReminder table and is claimed BEFORE the e-mail is sent. Sending
// first and recording after would double-send on a crash between the two; claiming first can at
// worst drop a reminder if delivery fails, which is the better failure for the reader.

export const REMINDER_KIND = {
  dayBefore: 'DAY_BEFORE',
  confirmationNudge: 'CONFIRMATION_NUDGE',
} as const

/** How far ahead the day-before reminder looks, and how wide the window is. */
const REMINDER_LEAD_HOURS = 24
// The window has to be at least as wide as the gap between cron runs, or appointments falling
// between two runs are never reminded. Six hours tolerates an hourly, four-hourly or six-hourly
// schedule without changing this code — the unique key stops the overlap from double-sending.
const WINDOW_HOURS = 6

/** Claims the right to send. Returns false when this reminder already went out. */
async function claim(appointmentId: string, kind: string): Promise<boolean> {
  try {
    await prisma.sentReminder.create({ data: { appointmentId, kind } })
    return true
  } catch {
    return false
  }
}

function emailData(a: {
  scheduledAt: Date
  modality: 'ONLINE' | 'PRESENCIAL' | 'AMBOS'
  price: number
  patient: { user: { name: string } }
  professional: { user: { name: string } }
}): AppointmentEmailData {
  return {
    patientName: a.patient.user.name,
    professionalName: a.professional.user.name,
    dateLabel: formatDateBR(a.scheduledAt),
    timeLabel: formatTimeBR(a.scheduledAt),
    modalityLabel: modalityLabel(a.modality),
    priceLabel: formatPrice(a.price),
  }
}

export interface ReminderRun {
  dayBefore: { considered: number; sent: number; skipped: number }
  nudges: { considered: number; sent: number; skipped: number }
}

export async function runReminders(now: Date = new Date()): Promise<ReminderRun> {
  const result: ReminderRun = {
    dayBefore: { considered: 0, sent: 0, skipped: 0 },
    nudges: { considered: 0, sent: 0, skipped: 0 },
  }

  // ── Day-before reminders ──────────────────────────────────────────────────
  const windowStart = new Date(now.getTime() + REMINDER_LEAD_HOURS * 3600_000)
  const windowEnd = new Date(windowStart.getTime() + WINDOW_HOURS * 3600_000)

  const upcoming = await prisma.appointment.findMany({
    where: { status: 'CONFIRMED', scheduledAt: { gte: windowStart, lt: windowEnd } },
    include: {
      patient: { include: { user: { select: { name: true, email: true } } } },
      professional: { include: { user: { select: { name: true, email: true, notifyBooking: true } } } },
    },
  })
  result.dayBefore.considered = upcoming.length

  for (const a of upcoming) {
    if (!(await claim(a.id, REMINDER_KIND.dayBefore))) {
      result.dayBefore.skipped++
      continue
    }
    const data = emailData(a)
    const url = a.meetingRoom ? meetingUrl(a.meetingRoom) : null

    // The patient's reminder is transactional — they asked for this appointment and need to
    // show up. The professional's follows their notifyBooking preference, matching how the
    // rest of lib/notifications.ts treats their inbox.
    await sendEmail({ to: a.patient.user.email, ...appointmentReminderPatient({ ...data, meetingUrl: url }) })
    if (a.professional.user.notifyBooking) {
      await sendEmail({
        to: a.professional.user.email,
        ...appointmentReminderProfessional({ ...data, meetingUrl: url }),
      })
    }
    result.dayBefore.sent++
  }

  // ── Nudges for bookings still awaiting confirmation ───────────────────────
  // Only worth sending while there is still time to act: past the deadline the slot is already
  // treated as free, so a nudge would be asking for something that can no longer happen.
  const nudgeCutoff = new Date(now.getTime() + 12 * 3600_000)
  const pending = await prisma.appointment.findMany({
    where: {
      status: 'AWAITING_CONFIRMATION',
      confirmationDeadline: { gt: now, lte: nudgeCutoff },
      scheduledAt: { gt: now },
    },
    include: {
      patient: { include: { user: { select: { name: true, email: true } } } },
      professional: { include: { user: { select: { name: true, email: true } } } },
    },
  })
  result.nudges.considered = pending.length

  for (const a of pending) {
    if (!(await claim(a.id, REMINDER_KIND.confirmationNudge))) {
      result.nudges.skipped++
      continue
    }
    const hoursLeft = Math.max(
      1,
      Math.round(((a.confirmationDeadline?.getTime() ?? now.getTime()) - now.getTime()) / 3600_000)
    )
    // Not gated on notifyBooking, for the same reason notifyBookingRequested isn't: silencing
    // this e-mail would cost the professional the slot and hurt their response-time ranking.
    await sendEmail({ to: a.professional.user.email, ...confirmationNudge({ ...emailData(a), hoursLeft }) })
    result.nudges.sent++
  }

  return result
}
