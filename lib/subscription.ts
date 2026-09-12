import type { Professional, ProfessionalSubscription, SubscriptionPlan } from '@prisma/client'
import { prisma } from './prisma'

// The freemium gate, in one place — the same shape as isPaidProfessional in stripe-connect.ts.
//
// The rule that matters most here is what this file does NOT do: a paid subscription never
// touches Professional.rankScore. Ranking stays a pure merit computation over ratings,
// responsiveness and recency (lib/ranking.ts). Paid visibility exists only as a separate band
// that is labelled "Patrocinado" on screen. Mixing the two would be undisclosed paid placement
// inside what patients read as a quality ranking — in a health marketplace that is the kind of
// misleading advertising CDC art. 37 exists to prohibit, and it is also simply a lie about what
// the ordering means.

export const FREE_PLAN_SLUG = 'gratuito'
export const PRO_PLAN_SLUG = 'profissional'

export type SubscriptionWithPlan = ProfessionalSubscription & { plan: SubscriptionPlan }

/**
 * Until this instant, every professional is treated as entitled regardless of what they pay.
 * Without it, turning the paywall on would instantly break every professional already using
 * the platform — including the ones who joined before a subscription existed to buy.
 * Unset (the default) means the grace period never ends, so deploying this code changes
 * nothing until someone deliberately sets a date.
 */
export function subscriptionEnforcedFrom(): Date | null {
  const raw = process.env.SUBSCRIPTION_ENFORCED_FROM
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function inGracePeriod(now: Date = new Date()): boolean {
  const from = subscriptionEnforcedFrom()
  return from === null || now < from
}

export interface Entitlements {
  /** Can patients book with this professional? */
  canReceiveBookings: boolean
  /** Is this professional eligible for the labelled sponsored band? */
  sponsored: boolean
  /** True when access comes from the grace period rather than from a paid plan. */
  viaGrace: boolean
  planName: string
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'NONE'
}

/**
 * A subscription is honoured while ACTIVE, and also while PAST_DUE — Stripe retries a failed
 * charge for days, and locking someone out on the first decline treats an expired card as if
 * it were a cancellation. CANCELLED still honours the period already paid for.
 */
export function subscriptionIsCurrent(
  sub: SubscriptionWithPlan | null | undefined,
  now: Date = new Date()
): boolean {
  if (!sub) return false
  if (sub.status === 'ACTIVE' || sub.status === 'PAST_DUE') return true
  // CANCELLED: the professional keeps what they already paid for, to the end of the period.
  return sub.currentPeriodEnd != null && sub.currentPeriodEnd > now
}

export function entitlementsFor(
  sub: SubscriptionWithPlan | null | undefined,
  now: Date = new Date()
): Entitlements {
  const current = subscriptionIsCurrent(sub, now)
  const grace = inGracePeriod(now)

  // What the plan itself grants, before the grace period is considered. Note that a free-plan
  // row is a perfectly "current" subscription — it just grants less — so the grace period has
  // to be applied on top of this rather than as a fallback for people who have no row. Written
  // as a fallback it would never fire for anyone, since ensureSubscription gives every
  // professional a free-plan row.
  const planAllowsBookings = current && sub ? sub.plan.canReceiveBookings : false
  const planIsSponsored = current && sub ? sub.plan.sponsored : false

  return {
    canReceiveBookings: planAllowsBookings || grace,
    // Sponsorship is never granted by the grace period: a free slot in a paid band would be
    // taken from the professionals actually paying for it.
    sponsored: planIsSponsored,
    viaGrace: grace && !planAllowsBookings,
    planName: sub?.plan.name ?? 'Gratuito',
    status: sub?.status ?? 'NONE',
  }
}

export async function getEntitlements(professionalId: string, now: Date = new Date()): Promise<Entitlements> {
  const sub = await prisma.professionalSubscription.findUnique({
    where: { professionalId },
    include: { plan: true },
  })
  return entitlementsFor(sub, now)
}

/** Ensures a professional always has a plan row, defaulting to the free tier. */
export async function ensureSubscription(professionalId: string): Promise<SubscriptionWithPlan | null> {
  const existing = await prisma.professionalSubscription.findUnique({
    where: { professionalId },
    include: { plan: true },
  })
  if (existing) return existing

  const free = await prisma.subscriptionPlan.findUnique({ where: { slug: FREE_PLAN_SLUG } })
  if (!free) return null

  return prisma.professionalSubscription.create({
    data: { professionalId, planId: free.id, status: 'ACTIVE' },
    include: { plan: true },
  })
}

/**
 * Picks the professionals for the sponsored band.
 *
 * Rotation is deliberate: without it the same subscriber occupies the slot on every search
 * forever, which is worth less to everyone paying and reads as a fixed ad. The rotation offset
 * advances daily and is derived from the date alone, so it is stable within a day (a patient
 * refreshing the page doesn't see the band shuffle) and identical across server instances
 * without any shared state.
 *
 * Ordering inside the band is by rankScore only as a tiebreaker among sponsors — it never
 * promotes a sponsor into the organic list.
 */
export const SPONSORED_SLOTS = 2

export function rotationOffset(now: Date = new Date()): number {
  return Math.floor(now.getTime() / 86_400_000)
}

export function pickSponsored<T extends Pick<Professional, 'id'>>(
  eligible: T[],
  slots = SPONSORED_SLOTS,
  now: Date = new Date()
): T[] {
  if (eligible.length === 0) return []
  if (eligible.length <= slots) return eligible
  const start = rotationOffset(now) % eligible.length
  // Rotate the list, then take from the front — every sponsor reaches the band as days pass.
  return [...eligible.slice(start), ...eligible.slice(0, start)].slice(0, slots)
}

/**
 * The professionals eligible for the sponsored band right now: on a sponsored plan, currently
 * paying, active, and excluding anyone already visible in the organic results being shown —
 * showing the same person twice on one page wastes the slot and looks broken.
 */
export async function sponsoredCandidates(excludeIds: string[] = [], now: Date = new Date()) {
  const subs = await prisma.professionalSubscription.findMany({
    where: {
      plan: { sponsored: true, active: true },
      professional: { status: 'ACTIVE', id: { notIn: excludeIds } },
    },
    include: { plan: true },
  })
  return subs.filter((s) => subscriptionIsCurrent(s, now)).map((s) => s.professionalId)
}
