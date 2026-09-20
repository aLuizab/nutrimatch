import { reaisToCents } from './money'

// The platform's cut of every payment, as a percentage. Configurable without a code change;
// 10 is the launch value. Read at call time (not module load) so changing it in the hosting
// panel takes effect on the next request.
export function platformFeePercent(): number {
  const raw = Number(process.env.PLATFORM_FEE_PERCENT)
  if (!Number.isFinite(raw) || raw < 0 || raw > 100) return 10
  return raw
}

export interface FeeBreakdown {
  /** What the patient pays. */
  totalCents: number
  /** What NutriMatch keeps. */
  feeCents: number
  /** What reaches the professional — the amount owed. The payout itself is a manual transfer. */
  netCents: number
  percentApplied: number
}

/**
 * Splits an amount into the platform fee and the professional's net. Rounding always favours
 * the professional (fee rounds down) so the split can never exceed the total.
 */
export function splitFee(totalCents: number, percent = platformFeePercent()): FeeBreakdown {
  const feeCents = Math.floor((totalCents * percent) / 100)
  return {
    totalCents,
    feeCents,
    netCents: totalCents - feeCents,
    percentApplied: percent,
  }
}

export function splitFeeFromReais(reais: number, percent = platformFeePercent()): FeeBreakdown {
  return splitFee(reaisToCents(reais), percent)
}
