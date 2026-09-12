import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { getStripe, stripeEnabled } from '@/lib/stripe'
import { syncSubscription } from '@/lib/stripe-subscription'
import { paymentIntentIdOf } from '@/lib/payments'
import { confirmationDeadlineFor } from '@/lib/appointment-status'
import { notifyBookingRequested } from '@/lib/notifications'

// Raw body required for signature verification — same reasoning as the connect webhook.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The platform endpoint: everything that happens on NutriMatch's own Stripe account —
// consultation checkouts, package checkouts, and the nutritionist subscription. Connect events
// (account.*) arrive at a different endpoint with a different signing secret. See DEPLOY.md.

/**
 * A consultation checkout finished. With manual capture this means the card was AUTHORISED,
 * not charged — so the PaymentIntent's own status is the authority here, never the session's
 * `payment_status`, whose meaning differs between capture modes.
 */
async function handleAppointmentCheckout(session: Stripe.Checkout.Session, appointmentId: string) {
  const intentId = paymentIntentIdOf(session)
  if (!intentId) {
    console.error('[stripe:webhook:platform] sessão de consulta sem PaymentIntent', session.id)
    return
  }

  const intent = await getStripe().paymentIntents.retrieve(intentId)
  const paymentStatus =
    intent.status === 'requires_capture' ? 'AUTHORIZED' : intent.status === 'succeeded' ? 'PAID' : null
  if (!paymentStatus) {
    console.error('[stripe:webhook:platform] PaymentIntent em estado inesperado', intentId, intent.status)
    return
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: { select: { name: true, email: true } } } },
      professional: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  })
  if (!appointment) {
    console.error('[stripe:webhook:platform] consulta não encontrada', appointmentId)
    return
  }
  // Already handled — the event is a retry, or the patient paid twice into the same session.
  if (appointment.paymentStatus !== 'PENDING') return

  // The professional's 24h clock starts NOW, not when the patient opened the checkout: until
  // this moment they were never told the booking existed, and lib/ranking.ts measures their
  // response time from paidAt for the same reason.
  const now = new Date()
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      paymentStatus,
      paymentIntentId: intentId,
      paidAt: now,
      paymentDeadline: null,
      confirmationDeadline: confirmationDeadlineFor(appointment.scheduledAt, now),
    },
  })

  // Only now is the professional told. Notifying at booking time would have pinged them for
  // every abandoned checkout, about consultations that never existed.
  notifyBookingRequested({
    scheduledAt: appointment.scheduledAt,
    modality: appointment.modality,
    price: appointment.price,
    patientName: appointment.patient.user.name,
    patientEmail: appointment.patient.user.email,
    professionalName: appointment.professional.user.name,
    professionalEmail: appointment.professional.user.email,
    professionalUserId: appointment.professional.user.id,
  })
}

/** A package checkout finished. Captured immediately — there is nobody to confirm a purchase. */
async function handleEnrollmentCheckout(session: Stripe.Checkout.Session, enrollmentId: string) {
  const intentId = paymentIntentIdOf(session)
  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } })
  if (!enrollment) {
    console.error('[stripe:webhook:platform] acompanhamento não encontrado', enrollmentId)
    return
  }
  if (enrollment.status !== 'PENDING_PAYMENT') return // retry

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      status: 'ACTIVE',
      paymentIntentId: intentId,
      paidAt: new Date(),
      // The program's clock starts when it is paid for, not when the checkout was opened.
      startedAt: new Date(),
    },
  })
}

/** The checkout expired without payment. The held slot has to go back on the market. */
async function handleExpiredCheckout(session: Stripe.Checkout.Session) {
  const { appointmentId, enrollmentId } = session.metadata ?? {}

  if (appointmentId) {
    await prisma.appointment.updateMany({
      where: { id: appointmentId, paymentStatus: 'PENDING' },
      data: { status: 'EXPIRED', slotHeldAt: null, paymentStatus: 'VOIDED' },
    })
  }
  if (enrollmentId) {
    await prisma.enrollment.deleteMany({ where: { id: enrollmentId, status: 'PENDING_PAYMENT' } })
  }
}

export async function POST(request: Request) {
  if (!stripeEnabled || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Assinatura ausente' }, { status: 400 })

  const raw = await request.text()
  let event: Stripe.Event
  try {
    event = await getStripe().webhooks.constructEventAsync(raw, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (e) {
    console.error('[stripe:webhook:platform] signature verification failed', e)
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
  }

  // Idempotency: Stripe retries the same event id for up to 3 days. A duplicate is a no-op.
  try {
    await prisma.webhookEvent.create({ data: { id: event.id, type: event.type } })
  } catch {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const { appointmentId, enrollmentId } = session.metadata ?? {}
        if (appointmentId) await handleAppointmentCheckout(session, appointmentId)
        else if (enrollmentId) await handleEnrollmentCheckout(session, enrollmentId)
        // A session with neither is the subscription checkout, handled by the
        // customer.subscription.* events below — nothing to do here.
        break
      }
      case 'checkout.session.expired':
        await handleExpiredCheckout(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_failed':
      case 'invoice.payment_succeeded': {
        // The invoice tells us payment moved; the subscription object is the source of truth for
        // what that means, so re-read it rather than inferring a status from the invoice.
        const invoice = event.data.object as Stripe.Invoice
        const subId = (invoice as unknown as { subscription?: string | { id: string } }).subscription
        const id = typeof subId === 'string' ? subId : subId?.id
        if (id) await syncSubscription(await getStripe().subscriptions.retrieve(id))
        break
      }
    }
  } catch (e) {
    // Release the idempotency claim before asking Stripe to retry. Leaving the row in place
    // would make every retry look like a duplicate and no-op, so a transient database blip
    // would silently swallow a real payment event — the failure mode idempotency was supposed
    // to prevent, inverted.
    await prisma.webhookEvent.delete({ where: { id: event.id } }).catch(() => {})
    console.error('[stripe:webhook:platform] handler error', event.type, event.id, e)
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
