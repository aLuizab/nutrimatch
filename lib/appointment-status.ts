import type { Prisma } from '@prisma/client'

// Adding AWAITING_CONFIRMATION means every existing `status: 'CONFIRMED'` filter had to decide
// whether it now also means "…and the ones still awaiting". TypeScript cannot catch a missed
// one (the old clauses stay valid), so the decision lives here as named intents instead of
// being retyped — and re-read — at 17 call sites.

/** Occupies the professional's calendar: confirmed, or awaiting and still within deadline. */
export const OCCUPYING_STATUSES = ['CONFIRMED', 'AWAITING_CONFIRMATION'] as const

/** A real booking. Revenue, reviews and "consultas realizadas" must use this — never include
 *  awaiting, which may still evaporate. */
export const BOOKED_STATUSES = ['CONFIRMED'] as const

/**
 * Slot occupancy for availability checks. An awaiting appointment holds its slot only until its
 * deadline; past it the slot is free again without anything having to run.
 *
 * There are now TWO deadlines, because there are two different reasons a booking can be sitting
 * unconfirmed, and they deserve very different patience:
 *
 *  - PENDING payment — the patient opened the checkout and hasn't paid. Minutes, not hours: an
 *    abandoned cart must not hold someone's calendar. See PAYMENT_HOLD_MINUTES.
 *  - anything else — payment is settled (or was never required) and we're waiting on the
 *    professional. That gets the full 24h confirmation window.
 *
 * Collapsing the two into one deadline would either give abandoned carts a full day of the
 * professional's calendar, or give the professional 20 minutes to answer.
 */
export function slotOccupiedWhere(now: Date = new Date()): Prisma.AppointmentWhereInput {
  return {
    OR: [
      { status: 'CONFIRMED' },
      {
        status: 'AWAITING_CONFIRMATION',
        paymentStatus: 'PENDING',
        paymentDeadline: { gt: now },
      },
      {
        status: 'AWAITING_CONFIRMATION',
        paymentStatus: { not: 'PENDING' },
        confirmationDeadline: { gt: now },
      },
    ],
  }
}

/** True when an awaiting appointment has run out of time and should be treated as expired. */
export function isExpiredAwaiting(
  appointment: {
    status: string
    confirmationDeadline: Date | null
    paymentStatus?: string
    paymentDeadline?: Date | null
  },
  now: Date = new Date()
): boolean {
  if (appointment.status !== 'AWAITING_CONFIRMATION') return false
  if (appointment.paymentStatus === 'PENDING') {
    return appointment.paymentDeadline != null && appointment.paymentDeadline <= now
  }
  return appointment.confirmationDeadline != null && appointment.confirmationDeadline <= now
}

/** Matches awaiting rows whose hold has lapsed, for the booking route to release before insert. */
export function staleHoldWhere(now: Date = new Date()): Prisma.AppointmentWhereInput {
  return {
    status: 'AWAITING_CONFIRMATION',
    OR: [
      { paymentStatus: 'PENDING', paymentDeadline: { lte: now } },
      { paymentStatus: { not: 'PENDING' }, confirmationDeadline: { lte: now } },
    ],
  }
}

/** Hours a professional has to accept a booking before the slot is released. */
export const CONFIRMATION_WINDOW_HOURS = 24

export function confirmationDeadlineFor(scheduledAt: Date, now: Date = new Date()): Date {
  const standard = new Date(now.getTime() + CONFIRMATION_WINDOW_HOURS * 60 * 60 * 1000)
  // A consultation booked for tomorrow morning can't have a 24h window — the deadline would
  // fall after the consultation itself. Cap it at the appointment time.
  return standard < scheduledAt ? standard : scheduledAt
}

// ── Cancelamento e remarcação de consulta já confirmada ─────────────────────────────────────
// Duas janelas distintas, medidas a partir do horário marcado — não da confirmação:
//
// - Cancelar com reembolso: até CANCEL_REFUND_CUTOFF_HOURS antes. Depois disso, cancelar
//   continua possível (ver a rota de cancelamento), só que sem devolver o valor.
// - Remarcar: até RESCHEDULE_CUTOFF_HOURS antes — uma janela mais curta de propósito. Remarcar
//   não move dinheiro nenhum (não é reembolso nem cobrança nova), então pode ficar disponível
//   mais perto do horário do que um cancelamento que devolve o valor pago.

export const CANCEL_REFUND_CUTOFF_HOURS = 12
export const RESCHEDULE_CUTOFF_HOURS = 5

export function isWithinCancelRefundWindow(scheduledAt: Date, now: Date = new Date()): boolean {
  return scheduledAt.getTime() - now.getTime() >= CANCEL_REFUND_CUTOFF_HOURS * 60 * 60 * 1000
}

export function isWithinRescheduleWindow(scheduledAt: Date, now: Date = new Date()): boolean {
  return scheduledAt.getTime() - now.getTime() >= RESCHEDULE_CUTOFF_HOURS * 60 * 60 * 1000
}
