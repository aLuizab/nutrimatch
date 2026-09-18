import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'
import { PRO_PLAN_SLUG } from '@/lib/subscription'
import { addMonthsToDateString, instantAt, spDateString } from '@/lib/spdate'
import { configFailure, unexpectedFailure } from '@/lib/api-failures'

const bodySchema = z.union([
  z.object({
    action: z.literal('REGISTRAR_PAGAMENTO'),
    // More than one month at a time exists because people do pay a quarter up front.
    months: z.coerce.number().int().min(1).max(12).default(1),
  }),
  z.object({ action: z.literal('CANCELAR') }),
])

/**
 * Records the R$ 9,90 monthly fee by hand.
 *
 * There is no gateway telling us a charge cleared — the professional pays the platform through
 * a payment link and an admin confirms it here, the same shape as the Pix confirmation in
 * /api/admin/pagamentos. What the confirmation writes is currentPeriodEnd, because that is what
 * decides visibility (lib/subscription.ts#subscriptionIsCurrent). Nothing has to run later to
 * expire it.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin
  try {
    admin = await requireRole('ADMIN')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(admin.id, 'admin-mensalidade')
  if (limited) return limited

  const misconfigured = configFailure()
  if (misconfigured) return misconfigured

  const { id } = await params
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  try {
    const professional = await prisma.professional.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } }, subscription: { include: { plan: true } } },
    })
    if (!professional) {
      return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
    }

    if (parsed.data.action === 'CANCELAR') {
      if (!professional.subscription) {
        return NextResponse.json({ error: 'Este profissional não tem assinatura' }, { status: 409 })
      }
      // The month already paid for is not taken back — currentPeriodEnd is left alone and keeps
      // deciding. Cancelling means "does not renew", not "loses what was paid".
      await prisma.professionalSubscription.update({
        where: { professionalId: id },
        data: { status: 'CANCELLED', cancelAtPeriodEnd: true },
      })
      audit({
        actorId: admin.id,
        actorRole: 'ADMIN',
        action: 'SUBSCRIPTION_CANCELLED',
        subjectId: id,
        metadata: { professional: professional.user.email },
      })
      return NextResponse.json({ status: 'CANCELLED', currentPeriodEnd: professional.subscription.currentPeriodEnd })
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: PRO_PLAN_SLUG } })
    if (!plan) {
      return NextResponse.json(
        { error: 'O plano pago não existe no banco. Rode: npm run ensure-plans' },
        { status: 503 }
      )
    }

    // Paying early extends rather than restarts: counting from today would quietly swallow the
    // days still remaining, which is the kind of thing nobody notices until a professional does.
    const now = new Date()
    const base =
      professional.subscription?.currentPeriodEnd && professional.subscription.currentPeriodEnd > now
        ? professional.subscription.currentPeriodEnd
        : now
    const end = instantAt(addMonthsToDateString(spDateString(base), parsed.data.months), '23:59')

    const subscription = await prisma.professionalSubscription.upsert({
      where: { professionalId: id },
      create: { professionalId: id, planId: plan.id, status: 'ACTIVE', currentPeriodEnd: end },
      update: { planId: plan.id, status: 'ACTIVE', cancelAtPeriodEnd: false, currentPeriodEnd: end },
      include: { plan: true },
    })

    audit({
      actorId: admin.id,
      actorRole: 'ADMIN',
      action: 'SUBSCRIPTION_PAYMENT_RECORDED',
      subjectId: id,
      metadata: {
        professional: professional.user.email,
        months: parsed.data.months,
        amountCents: plan.monthlyPrice * parsed.data.months,
        until: end.toISOString(),
      },
    })

    return NextResponse.json({
      status: subscription.status,
      planName: subscription.plan.name,
      currentPeriodEnd: subscription.currentPeriodEnd,
    })
  } catch (e) {
    return unexpectedFailure('admin-mensalidade', e)
  }
}
