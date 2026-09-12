import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { getStripe, stripeEnabled } from '@/lib/stripe'
import { syncAccountStatus } from '@/lib/stripe-connect'

// Signature verification needs the raw body, which means Node runtime and no static
// optimisation. Never rely on defaults for the one route where a wrong runtime silently
// breaks verification.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Connect events (account.*) come from a DIFFERENT Stripe endpoint than platform events and
// therefore carry a different signing secret. See DEPLOY.md.
export async function POST(request: Request) {
  if (!stripeEnabled || !process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Assinatura ausente' }, { status: 400 })

  const raw = await request.text()
  let event: Stripe.Event
  try {
    event = await getStripe().webhooks.constructEventAsync(
      raw,
      signature,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    )
  } catch (e) {
    console.error('[stripe:webhook:connect] signature verification failed', e)
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
  }

  // Idempotency: Stripe retries the same event id for up to 3 days. A duplicate is a no-op.
  try {
    await prisma.webhookEvent.create({ data: { id: event.id, type: event.type } })
  } catch {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account
      const professional = await prisma.professional.findUnique({
        where: { stripeAccountId: account.id },
        select: { id: true },
      })
      if (professional) {
        // Re-fetch rather than trusting this payload's ordering — account.updated events can
        // arrive out of order, and last-write-wins with fresh data is order-insensitive.
        await syncAccountStatus(professional.id, account.id)
      }
    }
  } catch (e) {
    // Release the idempotency claim before asking Stripe to retry — otherwise the retry looks
    // like a duplicate and no-ops, turning a transient failure into a permanently lost event.
    await prisma.webhookEvent.delete({ where: { id: event.id } }).catch(() => {})
    console.error('[stripe:webhook:connect] handler error', e)
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
