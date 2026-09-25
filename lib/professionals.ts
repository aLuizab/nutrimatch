import type { Modality } from '@prisma/client'
import { avatarColor, initials, modalityLabel } from './format'
import { specialtyLabel } from './specialties'
import { effectiveModality } from './office'

export const PROFESSIONAL_CARD_INCLUDE = { user: { select: { name: true, photoUrl: true } } } as const

type ProfessionalCardSource = {
  id: string
  specialties: string[]
  rating: number
  reviewCount: number
  price: number
  modality: Modality
  officeAddress?: string | null
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
    // Como em toda leitura: sem endereço, presencial não existe. Ver lib/office.ts.
    modality: effectiveModality(p),
    modalityLabel: modalityLabel(effectiveModality(p)),
    city: p.city,
    tier: p.tier ?? 'NOVO',
    photoUrl: p.user.photoUrl ?? null,
    initials: initials(p.user.name),
    color: avatarColor(p.id),
  }
}

export type ProfessionalCard = ReturnType<typeof toProfessionalCard>
