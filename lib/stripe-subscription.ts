import type Stripe from 'stripe'
import { prisma } from './prisma'
import { appUrl, getStripe, stripeEnabled } from './stripe'
import { FREE_PLAN_SLUG, PRO_PLAN_SLUG } from './subscription'

// Platform subscriptions (the nutritionist's monthly fee). Deliberately separate from
// stripe-connect.ts, which handles the per-consultation split: they are different products with
// different money flows — this one charges the professional, that one charges the patient and
// pays the professional out. Sharing a file would invite sharing an account id, and a Connect
// account id used as a Customer id fails in ways that are hard to read.

export function subscriptionsEnabled(): boolean {
  return stripeEnabled
}

/** Reuses the professional's Customer across billing cycles so their history stays in one place. */
async function ensureCustomer(professionalId: string, email: string, name: string): Promise<string> {
  const stripe = getStripe()
  const existing = await prisma.professionalSubscription.findUnique({
    where: { professionalId },
    select: { stripeCustomerId: true },
  })
  if (existing?.stripeCustomerId) return existing.stripeCustomerId

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { professionalId },
  })
  await prisma.professionalSubscription.update({
    where: { professionalId },
    data: { stripeCustomerId: customer.id },
  })
  return customer.id
}

export async function createSubscriptionCheckout(
  professionalId: string,
  email: string,
  name: string
): Promise<string> {
  const stripe = getStripe()

  const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: PRO_PLAN_SLUG } })
  if (!plan?.stripePriceId) {
    // A clear message beats a Stripe error about a missing price: this is a setup step the
    // admin has not done yet, not a bug and not the professional's problem.
    throw new Error(
      'O plano pago ainda não está ligado a um preço no Stripe. Configure STRIPE price e grave em SubscriptionPlan.stripePriceId (ver DEPLOY.md).'
    )
  }

  const customerId = await ensureCustomer(professionalId, email, name)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    // The professional id travels on the subscription itself, so the webhook can resolve the
    // row without depending on the checkout session still being retrievable.
    subscription_data: { metadata: { professionalId, planId: plan.id } },
    metadata: { professionalId, planId: plan.id },
    success_url: `${appUrl()}/assinatura?status=sucesso`,
    cancel_url: `${appUrl()}/assinatura?status=cancelado`,
  })

  if (!session.url) throw new Error('Stripe não retornou a URL do checkout')
  return session.url
}

/** The billing portal is where the professional changes card, sees invoices, or cancels. */
export async function createBillingPortalLink(professionalId: string): Promise<string> {
  const stripe = getStripe()
  const sub = await prisma.professionalSubscription.findUnique({
    where: { professionalId },
    select: { stripeCustomerId: true },
  })
  if (!sub?.stripeCustomerId) throw new Error('Nenhuma assinatura para gerenciar')

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${appUrl()}/assinatura`,
  })
  return session.url
}

function mapStatus(stripeStatus: Stripe.Subscription.Status): 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'ACTIVE'
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE'
    default:
      // incomplete, incomplete_expired, canceled, paused — none of these entitle anything new.
      return 'CANCELLED'
  }
}

/**
 * Writes a Stripe subscription's current state onto our row. Re-reads nothing from the event
 * payload beyond the object Stripe sent, but is written to be order-insensitive: every field is
 * last-write-wins from a full object, so an out-of-order retry converges to the same state.
 */
export async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const professionalId = subscription.metadata?.professionalId
  if (!professionalId) {
    console.error('[stripe:subscription] evento sem professionalId em metadata', subscription.id)
    return
  }

  const status = mapStatus(subscription.status)
  // A cancelled subscription drops back to the free plan, but only once the paid period is
  // actually over — lib/subscription.ts honours currentPeriodEnd for exactly this reason.
  const planSlug = status === 'CANCELLED' ? FREE_PLAN_SLUG : PRO_PLAN_SLUG
  const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: planSlug } })
  if (!plan) {
    console.error(`[stripe:subscription] plano ${planSlug} não existe — rode npm run ensure-plans`)
    return
  }

  const periodEndUnix = (subscription as unknown as { current_period_end?: number }).current_period_end
  const currentPeriodEnd = typeof periodEndUnix === 'number' ? new Date(periodEndUnix * 1000) : null

  await prisma.professionalSubscription.update({
    where: { professionalId },
    data: {
      planId: plan.id,
      status,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    },
  })
}
