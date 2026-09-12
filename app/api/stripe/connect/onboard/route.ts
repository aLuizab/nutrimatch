import { NextResponse } from 'next/server'
import { AuthError, requireRole } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { appUrl, stripeEnabled } from '@/lib/stripe'
import { createOnboardingLink } from '@/lib/stripe-connect'

// CSRF: this endpoint CREATES a real Stripe account and persists stripeAccountId, so it must
// never be reachable by navigation. SameSite=Lax cookies ARE sent on cross-site top-level
// navigations, so a GET here meant an attacker's link could provision a Stripe account in the
// victim professional's name — and the effect is permanent, since the id is stored. Mutation
// is POST-only (a cross-site form POST doesn't carry a Lax cookie); GET exists purely as the
// refresh_url Stripe bounces expired onboarding links back to, and only redirects.
export async function POST() {
  let user
  try {
    user = await requireRole('PROFESSIONAL')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'stripe-onboard')
  if (limited) return limited

  if (!stripeEnabled) {
    return NextResponse.json({ error: 'Pagamentos ainda não estão configurados nesta instalação' }, { status: 503 })
  }

  try {
    const url = await createOnboardingLink(user.professional!.id, user.email)
    return NextResponse.json({ url })
  } catch (e) {
    console.error('[stripe:onboard]', e)
    return NextResponse.json({ error: 'Não foi possível iniciar a conexão com o Stripe' }, { status: 502 })
  }
}

// Stripe's refresh_url target. Only ever sends the professional back to the settings page —
// the client there re-initiates onboarding through the POST above.
export async function GET() {
  return NextResponse.redirect(`${appUrl()}/configuracoes?stripe=retomar`, { status: 303 })
}
