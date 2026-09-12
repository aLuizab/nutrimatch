import { NextResponse } from 'next/server'
import { AuthError, requireRole } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { appUrl, stripeEnabled } from '@/lib/stripe'
import { createDashboardLink, syncAccountStatus } from '@/lib/stripe-connect'

/** Re-reads the connected account from Stripe. Used by the "atualizar status" button. */
export async function POST() {
  let user
  try {
    user = await requireRole('PROFESSIONAL')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'stripe-refresh')
  if (limited) return limited

  const accountId = user.professional?.stripeAccountId
  if (!stripeEnabled || !accountId) {
    return NextResponse.json({ error: 'Nenhuma conta Stripe conectada' }, { status: 400 })
  }

  try {
    await syncAccountStatus(user.professional!.id, accountId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[stripe:refresh]', e)
    return NextResponse.json({ error: 'Não foi possível consultar o Stripe' }, { status: 502 })
  }
}

/** Redirects the professional to their own Stripe Express dashboard. */
export async function GET() {
  let user
  try {
    user = await requireRole('PROFESSIONAL')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.redirect(`${appUrl()}/login`, { status: 303 })
    throw e
  }

  const accountId = user.professional?.stripeAccountId
  if (!stripeEnabled || !accountId) {
    return NextResponse.redirect(`${appUrl()}/configuracoes`, { status: 303 })
  }

  try {
    const url = await createDashboardLink(accountId)
    return NextResponse.redirect(url, { status: 303 })
  } catch (e) {
    console.error('[stripe:dashboard]', e)
    return NextResponse.redirect(`${appUrl()}/configuracoes?stripe=erro`, { status: 303 })
  }
}
