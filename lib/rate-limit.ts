// In-memory sliding-window rate limiter.
//
// Deliberate trade-off for this MVP: no external service, no cost, works today. The honest
// limitations — counters reset on every deploy, and if the app ever runs more than one
// instance each keeps its own window, so the effective limit multiplies by the instance
// count. That is acceptable against the threat this actually defends against (a bot trying
// thousands of passwords), and inadequate for a distributed attacker on a scaled-out
// deployment. Swap the store for Redis if either assumption stops holding.

interface Hit {
  timestamps: number[]
}

const buckets = new Map<string, Hit>()

// Without this the map grows forever — every unique IP ever seen stays resident.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000
let lastSweep = Date.now()

function sweep(now: number, windowMs: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now
  for (const [key, hit] of buckets) {
    const alive = hit.timestamps.filter((t) => now - t < windowMs)
    if (alive.length === 0) buckets.delete(key)
    else hit.timestamps = alive
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  /** Seconds until the caller may retry. Only meaningful when allowed is false. */
  retryAfter: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now, windowMs)

  const hit = buckets.get(key) ?? { timestamps: [] }
  const recent = hit.timestamps.filter((t) => now - t < windowMs)

  if (recent.length >= limit) {
    const oldest = Math.min(...recent)
    buckets.set(key, { timestamps: recent })
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    }
  }

  recent.push(now)
  buckets.set(key, { timestamps: recent })
  return { allowed: true, remaining: limit - recent.length, retryAfter: 0 }
}

/**
 * Best-effort client IP. Behind Railway/Vercel the real address is in x-forwarded-for; the
 * first entry is the client, the rest are proxies. Falls back to a constant, which degrades
 * to a global limit rather than to no limit at all.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

export const LIMITS = {
  /** Brute-force defence: password guessing against a known email. */
  login: { limit: 5, windowMs: 15 * 60 * 1000 },
  /** Account-creation spam and email enumeration probing. */
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  /** Password-reset request flooding (also an email-sending cost control). */
  passwordReset: { limit: 3, windowMs: 60 * 60 * 1000 },
  /** Generous ceiling on authenticated writes — catches runaway scripts, not real users. */
  mutation: { limit: 60, windowMs: 60 * 1000 },
  /** Public, unauthenticated proxy to the IBGE locations API — keyed by IP, not userId, since
   *  it's reachable from the signup form before anyone has an account. */
  locations: { limit: 30, windowMs: 60 * 1000 },
  /** Public pricing-guide aggregate (no PII) — same reason as above, reachable pre-login. */
  pricingGuide: { limit: 30, windowMs: 60 * 1000 },
} as const

/** Ready-made 429 response with the standard Retry-After header. */
export function tooManyRequests(result: RateLimitResult, message: string) {
  return Response.json(
    { error: message },
    { status: 429, headers: { 'Retry-After': String(result.retryAfter) } }
  )
}

/**
 * The ceiling on authenticated writes, keyed per user and per route scope. Returns a 429
 * Response to hand straight back, or null to continue — so a route adds one line and an early
 * return rather than its own bucket bookkeeping.
 *
 * Scoped by route because one shared bucket would let a chatty endpoint (saving availability,
 * say) exhaust the allowance for an unrelated one. Deliberately NOT applied to webhooks, whose
 * caller is Stripe and whose retries are the mechanism that makes delivery reliable, nor to
 * logout, where failing closed would trap a user in a session they asked to end.
 */
export function guardMutation(userId: string, scope: string): Response | null {
  const result = rateLimit(`${scope}:${userId}`, LIMITS.mutation.limit, LIMITS.mutation.windowMs)
  if (result.allowed) return null
  return tooManyRequests(result, 'Muitas requisições em pouco tempo. Aguarde alguns segundos.')
}
