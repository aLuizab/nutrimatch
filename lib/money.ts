// Existing price fields (Professional.price, Appointment.price, CarePlan/Enrollment pricing)
// stay whole reais — Int — as they've always been; migrating them to cents would touch every
// price display and filter in the app for no good reason. New payment records
// (Fase 2+) store cents, because a 10% fee over reais loses centavos and the split must be exact.
// This file is the ONLY place a bare `* 100` / `/ 100` conversion should appear — grep for
// stray literals if a new money field shows up elsewhere.
export function reaisToCents(reais: number): number {
  return Math.round(reais * 100)
}

export function centsToReais(cents: number): number {
  return cents / 100
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatCents(cents: number): string {
  return BRL.format(centsToReais(cents))
}
