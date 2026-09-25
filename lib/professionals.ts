import type { Modality } from '@prisma/client'
import { avatarColor, initials, modalityLabel } from './format'
import { specialtyLabel } from './specialties'

export const PROFESSIONAL_CARD_INCLUDE = { user: { select: { name: true, photoUrl: true } } } as const

type ProfessionalCardSource = {
  id: string
  specialties: string[]
  rating: number
  reviewCount: number
  price: number
  modality: Modality
  city: string
  tier?: string | null
  user: { name: string; photoUrl?: string | null }
}

export function toProfessionalCard(p: ProfessionalCardSource) {
  return {
    id: p.id,
    name: p.user.name,
    specialties: p.specialties,
    specialty: p.specialties[0] ?? '',
    specialtyLabel: specialtyLabel(p.specialties),
    rating: p.rating,
    reviewCount: p.reviewCount,
    price: p.price,
    modality: p.modality,
    modalityLabel: modalityLabel(p.modality),
    city: p.city,
    tier: p.tier ?? 'NOVO',
    photoUrl: p.user.photoUrl ?? null,
    initials: initials(p.user.name),
    color: avatarColor(p.id),
  }
}

export type ProfessionalCard = ReturnType<typeof toProfessionalCard>
