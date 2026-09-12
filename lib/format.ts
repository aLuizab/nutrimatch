import type { Modality } from '@prisma/client'

export function modalityLabel(modality: Modality) {
  switch (modality) {
    case 'ONLINE':
      return 'Online'
    case 'PRESENCIAL':
      return 'Presencial'
    case 'AMBOS':
      return 'Online e Presencial'
  }
}

export function initials(name: string) {
  const parts = name
    .replace(/^(Dra?\.)\s*/i, '')
    .trim()
    .split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-green-500',
  'bg-teal-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-yellow-500',
]

export function avatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

const BRL_WHOLE = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// price is whole reais (Int) everywhere in this app except Payment.amountCents (see lib/money.ts).
export function formatPrice(price: number) {
  return BRL_WHOLE.format(price)
}

export function formatDateBR(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}

export function formatTimeBR(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}

export function formatWeekdayShortBR(date: Date) {
  const label = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1, 3).replace('.', '')
}

export function relativeTimeBR(date: Date, now: Date = new Date()) {
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 1) return 'Hoje'
  if (diffDays === 1) return 'Há 1 dia'
  if (diffDays < 7) return `Há ${diffDays} dias`
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks === 1) return 'Há 1 semana'
  if (diffWeeks < 5) return `Há ${diffWeeks} semanas`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths <= 1) return 'Há 1 mês'
  return `Há ${diffMonths} meses`
}

export type AppointmentDisplayStatus =
  | 'concluido'
  | 'proximo'
  | 'pendente'
  | 'cancelado'
  | 'aguardando'
  | 'expirado'

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentDisplayStatus, string> = {
  concluido: 'Concluída',
  proximo: 'Em breve',
  pendente: 'Agendada',
  cancelado: 'Cancelada',
  aguardando: 'Aguardando confirmação',
  expirado: 'Não confirmada',
}

// Time-derived where it can be ('concluído' is just "in the past"), stored where it can't —
// waiting on the professional is a real state, not a function of the clock. Note 'pendente'
// already meant "confirmed, still in the future", so awaiting gets its own label rather than
// overloading a word that already means something else here.
export function appointmentDisplayStatus(
  scheduledAt: Date,
  status: 'CONFIRMED' | 'CANCELLED' | 'AWAITING_CONFIRMATION' | 'EXPIRED',
  now: Date = new Date()
): AppointmentDisplayStatus {
  if (status === 'CANCELLED') return 'cancelado'
  if (status === 'EXPIRED') return 'expirado'
  if (status === 'AWAITING_CONFIRMATION') return 'aguardando'
  const diffMs = scheduledAt.getTime() - now.getTime()
  if (diffMs < 0) return 'concluido'
  if (diffMs < 1000 * 60 * 60 * 2) return 'proximo'
  return 'pendente'
}

/**
 * How a payment state reads to a human. The distinction that matters most is AUTHORIZED:
 * "reservado" is not "pago", and a patient who sees a hold on their bank app needs the product
 * to use the same word the bank does rather than claiming the consultation is paid for.
 */
export const PAYMENT_LABELS: Record<string, { label: string; tone: string; hint: string }> = {
  NOT_REQUIRED: {
    label: 'Pagamento direto',
    tone: 'bg-gray-50 text-gray-600 border-gray-100',
    hint: 'Combinado diretamente com o profissional, fora da plataforma.',
  },
  PENDING: {
    label: 'Aguardando pagamento',
    tone: 'bg-amber-50 text-amber-700 border-amber-100',
    hint: 'O horário fica reservado por poucos minutos até o pagamento ser concluído.',
  },
  AUTHORIZED: {
    label: 'Valor reservado',
    tone: 'bg-blue-50 text-blue-700 border-blue-100',
    hint: 'O valor está reservado no cartão e só será cobrado quando o profissional confirmar.',
  },
  PAID: {
    label: 'Pago',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    hint: 'Cobrança efetivada.',
  },
  VOIDED: {
    label: 'Reserva liberada',
    tone: 'bg-gray-50 text-gray-500 border-gray-100',
    hint: 'A reserva no cartão foi cancelada e nada foi cobrado.',
  },
  REFUNDED: {
    label: 'Estornado',
    tone: 'bg-gray-50 text-gray-500 border-gray-100',
    hint: 'O valor foi devolvido na forma de pagamento original.',
  },
}
