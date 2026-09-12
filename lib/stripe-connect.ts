import type { Professional } from '@prisma/client'
import { prisma } from './prisma'
import { appUrl, getStripe, stripeEnabled } from './stripe'

// Minimal shape of the v2 surface this file uses. The Stripe SDK ships v2 at runtime but does
// not export types for it yet, so the shape is declared here rather than sprinkling `any`.
interface StripeV2 {
  v2: {
    core: {
      accounts: {
        create(params: Record<string, unknown>): Promise<{ id: string }>
        retrieve(id: string, params?: Record<string, unknown>): Promise<Record<string, any>>
      }
      accountLinks: { create(params: Record<string, unknown>): Promise<{ url: string }> }
    }
  }
}

/**
 * The single predicate that decides whether money flows through the platform for a given
 * professional. Everything else in the app branches on this — never on whether Stripe keys
 * exist — which is what makes gradual adoption and graceful degradation the same code path.
 */
export function isPaidProfessional(
  professional: Pick<Professional, 'stripeChargesEnabled'> | null | undefined
): boolean {
  return stripeEnabled && professional?.stripeChargesEnabled === true
}

/**
 * Creates the connected account on first use, then returns a fresh onboarding link.
 *
 * Uses Accounts **v2**. Stripe now rejects v1 `accounts.create` for new integrations outright
 * ("Stripe no longer recommends Accounts v1"), so the v1 call this used to make fails against a
 * current Stripe account and no professional could connect at all. The v2 shape differs in ways
 * worth knowing: capabilities are nested per configuration (merchant / recipient), the country
 * and entity type live under `identity`, and who absorbs fees and losses is declared up front
 * in `defaults.responsibilities`.
 */
export async function createOnboardingLink(professionalId: string, email: string) {
  // The v2 surface isn't in the SDK's typed namespace yet; the cast is contained to this file.
  const stripe = getStripe() as unknown as StripeV2

  const professional = await prisma.professional.findUnique({ where: { id: professionalId } })
  if (!professional) throw new Error('Professional not found')

  let accountId = professional.stripeAccountId
  if (!accountId) {
    const account = await stripe.v2.core.accounts.create({
      contact_email: email,
      display_name: 'NutriMatch',
      // Express dashboard: Stripe hosts the onboarding and the payouts screen, so we never
      // touch identity documents or bank details.
      dashboard: 'express',
      identity: { country: 'br', entity_type: 'individual' },
      configuration: {
        merchant: {
          capabilities: { card_payments: { requested: true } },
          // MCC 8049 — health practitioners. Neutral on purpose: never the professional's name
          // or specialty, which would leak health context onto a card statement.
          mcc: '8049',
        },
        recipient: {
          capabilities: { stripe_balance: { stripe_transfers: { requested: true } } },
        },
      },
      defaults: {
        currency: 'brl',
        // The platform collects the fee and absorbs losses — the arrangement destination
        // charges with an application fee assume.
        responsibilities: { fees_collector: 'application', losses_collector: 'application' },
      },
    })
    accountId = account.id
    // Persisted before returning the link: if the user abandons onboarding we reuse this
    // account instead of creating a second one.
    await prisma.professional.update({
      where: { id: professionalId },
      data: { stripeAccountId: accountId },
    })
  }

  // Account links are single-use and expire in minutes — always create fresh, never store.
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        configurations: ['merchant', 'recipient'],
        refresh_url: `${appUrl()}/api/stripe/connect/onboard`,
        return_url: `${appUrl()}/configuracoes?stripe=ok`,
      },
    },
  })
  return link.url
}

/** Pulls current account state from Stripe into our DB. Safe to call repeatedly. */
export async function syncAccountStatus(professionalId: string, accountId: string) {
  const stripe = getStripe()
  const account = await stripe.accounts.retrieve(accountId)

  const due = [
    ...(account.requirements?.currently_due ?? []),
    ...(account.requirements?.past_due ?? []),
  ]

  await prisma.professional.update({
    where: { id: professionalId },
    data: {
      stripeChargesEnabled: account.charges_enabled ?? false,
      stripePayoutsEnabled: account.payouts_enabled ?? false,
      stripeDisabledReason: account.requirements?.disabled_reason ?? null,
      stripeRequirementsDue: [...new Set(due)],
    },
  })

  return account
}

/** Link to the professional's own Stripe dashboard, where their real payouts/fees live. */
export async function createDashboardLink(accountId: string) {
  const stripe = getStripe()
  const link = await stripe.accounts.createLoginLink(accountId)
  return link.url
}
