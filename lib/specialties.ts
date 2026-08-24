// Single source of truth for specialties — DB stores the `long` form; chips/filters display
// the `short` form. Replaces the four arrays that used to be duplicated across cadastro,
// configurações, FilterFields and the landing page.
export const SPECIALTY_NAMES = [
  'Nutrição Esportiva',
  'Nutrição Clínica',
  'Nutrição Funcional',
  'Nutrição Infantil',
  'Nutrição Vegana',
  'Nutrição Oncológica',
] as const

export type SpecialtyName = (typeof SPECIALTY_NAMES)[number]

export const SPECIALTIES: { long: SpecialtyName; short: string; emoji: string; color: string }[] = [
  { long: 'Nutrição Esportiva', short: 'Esportiva', emoji: '🏃', color: 'bg-orange-50 text-orange-600 border-orange-100' },
  { long: 'Nutrição Clínica', short: 'Clínica', emoji: '🩺', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { long: 'Nutrição Funcional', short: 'Funcional', emoji: '🌿', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { long: 'Nutrição Infantil', short: 'Infantil', emoji: '👶', color: 'bg-pink-50 text-pink-600 border-pink-100' },
  { long: 'Nutrição Vegana', short: 'Vegana', emoji: '🥦', color: 'bg-green-50 text-green-600 border-green-100' },
  { long: 'Nutrição Oncológica', short: 'Oncológica', emoji: '💜', color: 'bg-purple-50 text-purple-600 border-purple-100' },
]

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Bridges free text and short chip labels to the canonical long names stored in the DB —
// Postgres scalar-list filters (has/hasSome) only do exact matches, so "esportiva" and
// "nutricao" must be resolved to full names before they reach the query.
export function matchSpecialties(query: string): SpecialtyName[] {
  const q = normalize(query.trim())
  if (!q) return []
  return SPECIALTIES.filter((s) => normalize(s.long).includes(q) || normalize(s.short).includes(q)).map((s) => s.long)
}

// Card display rule: primary specialty plus a "+N" suffix when there are more.
export function specialtyLabel(specialties: string[]): string {
  if (specialties.length === 0) return ''
  if (specialties.length === 1) return specialties[0]
  return `${specialties[0]} +${specialties.length - 1}`
}
