import Stripe from 'stripe'
import { appUrlProblem } from './env'

// Every payment feature is gated on this. Without STRIPE_SECRET_KEY the app behaves exactly
// as it did before payments existed: no professional can connect, so no professional is
// "paid", so every price stays an arrangement between patient and professional. Same
// graceful-degradation shape as lib/email.ts.
export const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY)

let client: Stripe | null = null

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set — payment features are disabled')
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Pinned: an unpinned version means Stripe can change response shapes under us.
      // Matches the version stripe@22.5.0 was generated against.
      apiVersion: '2026-07-29.dahlia',
      appInfo: { name: 'NutriMatch' },
    })
  }
  return client
}

let warnedAboutAppUrl = false

/**
 * Falls back to localhost when NEXT_PUBLIC_APP_URL is missing or unusable, and says so once in
 * the log. Returning the raw value unchecked was worse: an address like "meusite.com.br", with
 * no scheme, produced links a browser reads as a relative path.
 */
export function appUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '')
  if (raw) {
    try {
      new URL(raw)
      return raw
    } catch {
      // unusable — warned about and replaced below
    }
  }

  if (!warnedAboutAppUrl) {
    warnedAboutAppUrl = true
    console.warn('[appUrl]', appUrlProblem() ?? 'NEXT_PUBLIC_APP_URL indisponível')
  }
  return 'http://localhost:3000'
}
