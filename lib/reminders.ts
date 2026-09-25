import { prisma } from './prisma'
import { sendEmail } from './email'
import {
  appointmentReminderPatient,
  appointmentReminderProfessional,
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

// CONFIRMATION_NUDGE saiu daqui junto com o aceite do profissional: não existe mais consulta
// esperando um "sim" para cobrar. As linhas já gravadas em SentReminder com esse kind ficam —
// são registro de e-mail que saiu de verdade, e apagar histórico para limpar um enum é trocar
// uma verdade por uma arrumação.
export const REMINDER_KIND = {
  dayBefore: 'DAY_BEFORE',
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
}

export async function runReminders(now: Date = new Date()): Promise<ReminderRun> {
  const result: ReminderRun = {
    dayBefore: { considered: 0, sent: 0, skipped: 0 },
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

  return result
}
