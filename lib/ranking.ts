import { prisma } from './prisma'
import {
  computeReputationScore,
  getProfessionalReliabilityCounts,
  reliabilityScore,
  tierFor,
} from './reputation'

// Weighted ranking. Every weight and constant is here, in one place, so the ordering can be
// explained to a professional who asks why they rank where they do — which for a health
// marketplace is not optional.
//
// Paid subscriptions are deliberately absent from this file. Sponsored placement is a
// separate, labelled slot (see lib/subscription.ts); mixing it into this score would make
// paid placement indistinguishable from merit, which is exactly what CDC art. 37 forbids.

export const WEIGHTS = {
  rating: 0.5,
  responsiveness: 0.25,
  // Cumprir o que aceitou: consultas realizadas contra canceladas-após-confirmar e pedidos
  // deixados expirar. Entra com peso real (não simbólico) porque é o que o paciente sente
  // quando dá errado — mas abaixo da avaliação, que continua sendo o sinal principal.
  reliability: 0.15,
  recency: 0.1,
} as const

/**
 * Bayesian shrinkage. A raw average is a bad ranking key at low sample sizes: one 5.0 review
 * would outrank fifty 4.8s, and a brand-new professional with rating=0 would sink below
 * everyone rather than sitting mid-pack where "unknown" belongs.
 *
 * Pulling every professional toward the platform mean, in proportion to how little evidence
 * they have, fixes both ends with one mechanism.
 */
export const PRIOR_WEIGHT = 8 // reviews' worth of prior — roughly "trust the average until ~8 reviews"

export function shrunkRating(rating: number, reviewCount: number, platformMean: number): number {
  if (reviewCount <= 0) return platformMean
  return (rating * reviewCount + platformMean * PRIOR_WEIGHT) / (reviewCount + PRIOR_WEIGHT)
}

/** Maps median response seconds onto 0..1. Under 1h is excellent; beyond 48h adds nothing. */
export function responsivenessScore(medianSecs: number | null): number {
  if (medianSecs == null) return 0.5 // unknown sits mid-pack, never at the bottom
  const HOUR = 3600
  if (medianSecs <= HOUR) return 1
  if (medianSecs >= 48 * HOUR) return 0
  // Log scale: the difference between 1h and 4h matters far more than 40h vs 44h.
  const t = Math.log(medianSecs / HOUR) / Math.log(48)
  return Math.max(0, Math.min(1, 1 - t))
}

/** Decays over ~90 days of inactivity, so an abandoned profile drifts down instead of sticking. */
export function recencyScore(lastActivity: Date | null, now: Date = new Date()): number {
  if (!lastActivity) return 0
  const days = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
  if (days <= 7) return 1
  if (days >= 90) return 0
  return 1 - (days - 7) / 83
}

export function computeScore(input: {
  rating: number
  reviewCount: number
  platformMean: number
  medianResponseSecs: number | null
  lastActivity: Date | null
  /** 0..1 de lib/reputation.ts#reliabilityScore. Ausente = 0.5, o mesmo "desconhecido fica no
   *  meio do pelotão" que responsivenessScore aplica. */
  reliability?: number
  now?: Date
}): number {
  // Ratings are 1..5; normalise to 0..1 so every component shares a scale and the weights
  // mean what they say.
  const ratingNorm = (shrunkRating(input.rating, input.reviewCount, input.platformMean) - 1) / 4
  const score =
    WEIGHTS.rating * Math.max(0, Math.min(1, ratingNorm)) +
    WEIGHTS.responsiveness * responsivenessScore(input.medianResponseSecs) +
    WEIGHTS.reliability * (input.reliability ?? 0.5) +
    WEIGHTS.recency * recencyScore(input.lastActivity, input.now)
  return Math.round(score * 10000) / 10000
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid]
}

/** Platform-wide mean rating, used as the shrinkage prior. Falls back to 4.5 when there is
 *  nothing to average — an empty platform shouldn't pull everyone to zero. */
export async function platformMeanRating(): Promise<number> {
  const agg = await prisma.review.aggregate({ _avg: { rating: true }, _count: true })
  if (agg._count === 0 || agg._avg.rating == null) return 4.5
  return agg._avg.rating
}

const RESPONSE_SAMPLE_SIZE = 20

export async function recomputeRankScore(professionalId: string, meanOverride?: number) {
  const [professional, confirmations, lastAppointment, platformMean, reliabilityCounts] = await Promise.all([
    prisma.professional.findUnique({
      where: { id: professionalId },
      select: { rating: true, reviewCount: true },
    }),
    prisma.appointment.findMany({
      where: { professionalId, confirmedAt: { not: null } },
      select: { createdAt: true, confirmedAt: true, paidAt: true },
      orderBy: { confirmedAt: 'desc' },
      take: RESPONSE_SAMPLE_SIZE,
    }),
    prisma.appointment.findFirst({
      where: { professionalId },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    meanOverride != null ? Promise.resolve(meanOverride) : platformMeanRating(),
    getProfessionalReliabilityCounts(professionalId),
  ])
  if (!professional) return

  // The clock starts when the professional could actually act, not when the patient started
  // booking. On a paid consultation the professional isn't told anything until the payment is
  // authorised, so counting the patient's time at the checkout — up to PAYMENT_HOLD_MINUTES —
  // would charge the professional for someone else's hesitation and quietly lower their rank.
  const samples = confirmations.map((a) => {
    const start = (a.paidAt ?? a.createdAt).getTime()
    return Math.max(0, Math.round((a.confirmedAt!.getTime() - start) / 1000))
  })
  const medianResponseSecs = median(samples)

  const reliability = reliabilityScore(reliabilityCounts)
  const rankScore = computeScore({
    rating: professional.rating,
    reviewCount: professional.reviewCount,
    platformMean,
    medianResponseSecs,
    lastActivity: lastAppointment?.createdAt ?? null,
    reliability,
  })

  // Reputação e nível saem da mesma passada: são derivados exatamente das mesmas entradas, e
  // recalcular em outro momento é como as duas metades saem de sincronia.
  const reputationScore = computeReputationScore({
    shrunkRating: shrunkRating(professional.rating, professional.reviewCount, platformMean),
    reliability,
    responsiveness: responsivenessScore(medianResponseSecs),
  })
  const tier = tierFor(reputationScore, reliabilityCounts.fulfilled)

  await prisma.professional.update({
    where: { id: professionalId },
    data: {
      rankScore,
      medianResponseSecs,
      rankUpdatedAt: new Date(),
      reputationScore,
      tier,
      fulfilledCount: reliabilityCounts.fulfilled,
    },
  })
}

/** Full recompute — for the seed and for any change to the weights above. */
export async function recomputeAllRankScores() {
  const mean = await platformMeanRating()
  const all = await prisma.professional.findMany({ select: { id: true } })
  for (const p of all) {
    await recomputeRankScore(p.id, mean)
  }
  return all.length
}

/** Human-readable responsiveness, for the professional's card. */
export function responseLabel(medianSecs: number | null): string | null {
  if (medianSecs == null) return null
  const hours = medianSecs / 3600
  if (hours < 1) return 'Responde em minutos'
  if (hours < 24) return `Responde em ~${Math.round(hours)}h`
  const days = Math.round(hours / 24)
  return days === 1 ? 'Responde em ~1 dia' : `Responde em ~${days} dias`
}
