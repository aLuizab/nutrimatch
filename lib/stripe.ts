import Stripe from 'stripe'

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

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'
}
