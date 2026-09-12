import { NextResponse } from 'next/server'
import { AuthError, requireRole } from '@/lib/session'
import { createSubscriptionCheckout, subscriptionsEnabled } from '@/lib/stripe-subscription'
import { ensureSubscription } from '@/lib/subscription'
import { LIMITS, rateLimit, tooManyRequests } from '@/lib/rate-limit'

export async function POST() {
  let user
  try {
    user = await requireRole('PROFESSIONAL')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  if (!subscriptionsEnabled()) {
    return NextResponse.json({ error: 'Pagamentos não estão configurados nesta instalação.' }, { status: 503 })
  }

  const limit = rateLimit(`sub-checkout:${user.id}`, LIMITS.mutation.limit, LIMITS.mutation.windowMs)
  if (!limit.allowed) return tooManyRequests(limit, 'Muitas tentativas. Aguarde um instante.')

  // Guarantees the row the checkout writes its customer id onto exists before Stripe is called.
  await ensureSubscription(user.professional!.id)

  try {
    const url = await createSubscriptionCheckout(user.professional!.id, user.email, user.name)
    return NextResponse.json({ url })
  } catch (e) {
    console.error('[stripe:subscription:checkout]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Não foi possível iniciar a assinatura' },
      { status: 500 }
    )
  }
}
