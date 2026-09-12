import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requirePatientActor } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { addMonthsToDateString, instantAt, spDateString } from '@/lib/spdate'
import { createEnrollmentCheckout, paymentRequirementFor } from '@/lib/payments'

const enrollSchema = z.object({ carePlanId: z.string().min(1) })

export async function POST(request: Request) {
  let user
  try {
    user = await requirePatientActor()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'enrollment-create')
  if (limited) return limited

  const json = await request.json().catch(() => null)
  const parsed = enrollSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const plan = await prisma.carePlan.findUnique({
    where: { id: parsed.data.carePlanId },
    include: { professional: { include: { user: { select: { name: true } } } } },
  })
  if (!plan || !plan.active) {
    return NextResponse.json({ error: 'Programa indisponível' }, { status: 404 })
  }
  if (plan.professional.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Profissional indisponível' }, { status: 404 })
  }

  // One active program per professional. Different professionals are allowed — patients
  // legitimately see more than one specialist. A program still waiting for payment counts too,
  // so a patient can't open three checkouts for the same program and pay all of them.
  const existing = await prisma.enrollment.findFirst({
    where: {
      patientId: user.patient!.id,
      professionalId: plan.professionalId,
      status: { in: ['ACTIVE', 'PENDING_PAYMENT'] },
    },
  })
  if (existing) {
    // An abandoned checkout shouldn't lock the patient out forever, so a stale pending program
    // is cleared rather than reported as a conflict.
    if (existing.status === 'PENDING_PAYMENT' && existing.createdAt.getTime() < Date.now() - 30 * 60_000) {
      await prisma.enrollment.delete({ where: { id: existing.id } })
    } else {
      return NextResponse.json(
        {
          error:
            existing.status === 'PENDING_PAYMENT'
              ? 'Você já tem uma compra deste acompanhamento em andamento. Conclua ou aguarde alguns minutos.'
              : 'Você já tem um acompanhamento ativo com este profissional',
        },
        { status: 409 }
      )
    }
  }

  const professionalName = plan.professional.user.name
  const requirement = paymentRequirementFor(plan.professional, false)
  const today = spDateString(new Date())
  const enrollment = await prisma.enrollment.create({
    data: {
      carePlanId: plan.id,
      patientId: user.patient!.id,
      professionalId: plan.professionalId,
      // Snapshots: editing the plan (or the one-off price) later must not change anyone
      // already enrolled, and listPriceAtEnrollment keeps the comparison honest over time.
      pricePerConsultation: plan.pricePerConsultation,
      consultations: plan.consultations,
      listPriceAtEnrollment: plan.professional.price,
      endsAt: instantAt(addMonthsToDateString(today, plan.durationMonths), '23:59'),
      // A package that has to be paid for is not an active program until the money lands.
      status: requirement.required ? 'PENDING_PAYMENT' : 'ACTIVE',
    },
  })

  if (!requirement.required) {
    // No Stripe on this professional: the program records the agreed terms and the money is
    // arranged directly, exactly as it worked before payments existed.
    return NextResponse.json({ id: enrollment.id, paymentRequired: false })
  }

  try {
    const checkout = await createEnrollmentCheckout({
      enrollmentId: enrollment.id,
      totalReais: plan.pricePerConsultation * plan.consultations,
      consultations: plan.consultations,
      durationMonths: plan.durationMonths,
      planName: plan.name,
      professionalStripeAccountId: plan.professional.stripeAccountId!,
      professionalName: professionalName,
      patientEmail: user.email,
    })
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        checkoutSessionId: checkout.sessionId,
        paidAmountCents: checkout.amountCents,
        feeCents: checkout.feeCents,
      },
    })
    return NextResponse.json({ id: enrollment.id, paymentRequired: true, checkoutUrl: checkout.url })
  } catch (e) {
    console.error('[enrollments] falha ao criar checkout', enrollment.id, e)
    await prisma.enrollment.delete({ where: { id: enrollment.id } })
    return NextResponse.json(
      { error: 'Não foi possível iniciar o pagamento. Nenhum valor foi cobrado — tente novamente.' },
      { status: 502 }
    )
  }
}
