import { NextResponse } from 'next/server'
import { AuthError, requireRole } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { createBillingPortalLink, subscriptionsEnabled } from '@/lib/stripe-subscription'

export async function POST() {
  let user
  try {
    user = await requireRole('PROFESSIONAL')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'stripe-portal')
  if (limited) return limited

  if (!subscriptionsEnabled()) {
    return NextResponse.json({ error: 'Pagamentos não estão configurados nesta instalação.' }, { status: 503 })
  }

  try {
    const url = await createBillingPortalLink(user.professional!.id)
    return NextResponse.json({ url })
  } catch (e) {
    console.error('[stripe:subscription:portal]', e)
    return NextResponse.json({ error: 'Não foi possível abrir o portal de cobrança' }, { status: 500 })
  }
}
