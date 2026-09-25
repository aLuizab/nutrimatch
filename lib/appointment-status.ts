import type { Prisma } from '@prisma/client'

// Adding AWAITING_CONFIRMATION means every existing `status: 'CONFIRMED'` filter had to decide
// whether it now also means "…and the ones still awaiting". TypeScript cannot catch a missed
// one (the old clauses stay valid), so the decision lives here as named intents instead of
// being retyped — and re-read — at 17 call sites.
//
// Desde a reorganização do fluxo de pagamento, AWAITING_CONFIRMATION significa **só** "o
// pagamento ainda não foi conferido". O profissional não aceita mais consulta: quem a marca é a
// conferência do extrato. Ele continua podendo cancelar, o que pesa na confiabilidade dele.

/** Occupies the professional's calendar: confirmed, or awaiting and still within deadline. */
export const OCCUPYING_STATUSES = ['CONFIRMED', 'AWAITING_CONFIRMATION'] as const

/** A real booking. Revenue, reviews and "consultas realizadas" must use this — never include
 *  awaiting, which may still evaporate. */
export const BOOKED_STATUSES = ['CONFIRMED'] as const

/**
 * Slot occupancy for availability checks.
 *
 * AWAITING_CONFIRMATION quer dizer **uma coisa só**: aguardando pagamento. Não existe mais
 * consulta esperando o profissional aceitar — dinheiro conferido é consulta marcada (ver
 * confirmAppointmentPixPayment). Sobraram duas esperas, e elas merecem paciência diferente:
 *
 *  - `PENDING` — o paciente abriu a cobrança e não pagou. Minutos, não horas: carrinho
 *    abandonado não pode ocupar a agenda de alguém. Ver PAYMENT_HOLD_MINUTES.
 *  - `AWAITING_REVIEW` — o paciente declarou que pagou e ninguém conferiu o extrato ainda. Aqui
 *    o horário fica preso pelo prazo de conferência: quem pagou de verdade não pode perder o
 *    horário porque o admin demorou, e uma declaração que ninguém confirma também não pode
 *    prender a agenda para sempre. O prazo é o meio termo, e é curto por isso.
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
        paymentStatus: 'AWAITING_REVIEW',
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
      { paymentStatus: 'AWAITING_REVIEW', confirmationDeadline: { lte: now } },
    ],
  }
}

/**
 * Prazo para um admin conferir um pagamento declarado, antes de o horário ser liberado.
 *
 * Mesmo número e mesma conta de quando isto era o prazo do profissional aceitar — o que mudou é
 * de quem é o prazo. A coluna continua se chamando `confirmationDeadline` porque renomear coluna
 * é mudança de contração, e o nome antigo ainda descreve o que ela guarda: até quando esta
 * consulta pode ficar sem confirmação.
 */
export const PAYMENT_REVIEW_WINDOW_HOURS = 24

export function paymentReviewDeadlineFor(scheduledAt: Date, now: Date = new Date()): Date {
  const standard = new Date(now.getTime() + PAYMENT_REVIEW_WINDOW_HOURS * 60 * 60 * 1000)
  // Uma consulta marcada para amanhã de manhã não pode ter janela de 24h: o prazo cairia depois
  // da própria consulta. Trava no horário marcado.
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
