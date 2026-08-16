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

export function formatPrice(price: number) {
  return `R$ ${price}`
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

export type AppointmentDisplayStatus = 'concluido' | 'proximo' | 'pendente' | 'cancelado'

// Display status is derived from time, not stored — the DB only tracks CONFIRMED/CANCELLED.
export function appointmentDisplayStatus(
  scheduledAt: Date,
  status: 'CONFIRMED' | 'CANCELLED',
  now: Date = new Date()
): AppointmentDisplayStatus {
  if (status === 'CANCELLED') return 'cancelado'
  const diffMs = scheduledAt.getTime() - now.getTime()
  if (diffMs < 0) return 'concluido'
  if (diffMs < 1000 * 60 * 60 * 2) return 'proximo'
  return 'pendente'
}
