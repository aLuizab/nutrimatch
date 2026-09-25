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

// A componente de "tempo de resposta" saiu daqui quando o aceite do profissional deixou de
// existir: a consulta passou a ser marcada pela conferência do pagamento, e o que `confirmedAt`
// mede hoje é a demora do ADMIN em olhar o extrato. Rankear o profissional por isso seria cobrar
// dele o tempo de outra pessoa.
//
// Os 0.25 que ela carregava não foram diluídos igualmente. Foram para onde há evidência:
//   - rating 0.5 → 0.6, porque continua sendo o sinal mais rico que existe sobre alguém.
//   - reliability 0.15 → 0.3, dobrado, porque virou o **único** sinal de comportamento. Com o
//     aceite fora, cancelar uma consulta marcada é a principal forma de deixar um paciente na
//     mão, e precisa doer no ranking na mesma proporção.
//   - recency 0.1, intocada: nada sobre inatividade mudou.
export const WEIGHTS = {
  rating: 0.6,
  // Cumprir o que está marcado: consultas realizadas contra canceladas-após-confirmar e pedidos
  // deixados expirar.
  reliability: 0.3,
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
  lastActivity: Date | null
  /** 0..1 de lib/reputation.ts#reliabilityScore. Ausente = 0.5: "desconhecido" fica no meio do
   *  pelotão, nunca no fundo — quem não tem histórico não fez nada de errado. */
  reliability?: number
  now?: Date
}): number {
  // Ratings are 1..5; normalise to 0..1 so every component shares a scale and the weights
  // mean what they say.
  const ratingNorm = (shrunkRating(input.rating, input.reviewCount, input.platformMean) - 1) / 4
  const score =
    WEIGHTS.rating * Math.max(0, Math.min(1, ratingNorm)) +
    WEIGHTS.reliability * (input.reliability ?? 0.5) +
    WEIGHTS.recency * recencyScore(input.lastActivity, input.now)
  return Math.round(score * 10000) / 10000
}

/** Platform-wide mean rating, used as the shrinkage prior. Falls back to 4.5 when there is
 *  nothing to average — an empty platform shouldn't pull everyone to zero. */
export async function platformMeanRating(): Promise<number> {
  const agg = await prisma.review.aggregate({ _avg: { rating: true }, _count: true })
  if (agg._count === 0 || agg._avg.rating == null) return 4.5
  return agg._avg.rating
}

export async function recomputeRankScore(professionalId: string, meanOverride?: number) {
  const [professional, lastAppointment, platformMean, reliabilityCounts] = await Promise.all([
    prisma.professional.findUnique({
      where: { id: professionalId },
      select: { rating: true, reviewCount: true },
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

  const reliability = reliabilityScore(reliabilityCounts)
  const rankScore = computeScore({
    rating: professional.rating,
    reviewCount: professional.reviewCount,
    platformMean,
    lastActivity: lastAppointment?.createdAt ?? null,
    reliability,
  })

  // Reputação e nível saem da mesma passada: são derivados exatamente das mesmas entradas, e
  // recalcular em outro momento é como as duas metades saem de sincronia.
  const reputationScore = computeReputationScore({
    shrunkRating: shrunkRating(professional.rating, professional.reviewCount, platformMean),
    reliability,
  })
  const tier = tierFor(reputationScore, reliabilityCounts.fulfilled)

  await prisma.professional.update({
    where: { id: professionalId },
    data: {
      rankScore,
      // Zerada de propósito, e não deixada como estava: um número velho na coluna volta a ser
      // exibido no dia em que alguém reintroduzir a leitura, e aí estaria mostrando o tempo de
      // resposta de uma regra que não existe mais. Ver o comentário no schema.
      medianResponseSecs: null,
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
