import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'
import { addMonthsToDateString, instantAt, spDateString } from '@/lib/spdate'

const enrollSchema = z.object({ carePlanId: z.string().min(1) })

export async function POST(request: Request) {
  let user
  try {
    user = await requireRole('PATIENT')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const json = await request.json().catch(() => null)
  const parsed = enrollSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const plan = await prisma.carePlan.findUnique({
    where: { id: parsed.data.carePlanId },
    include: { professional: true },
  })
  if (!plan || !plan.active) {
    return NextResponse.json({ error: 'Programa indisponível' }, { status: 404 })
  }
  if (plan.professional.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Profissional indisponível' }, { status: 404 })
  }

  // One active program per professional. Different professionals are allowed — patients
  // legitimately see more than one specialist.
  const existing = await prisma.enrollment.findFirst({
    where: { patientId: user.patient!.id, professionalId: plan.professionalId, status: 'ACTIVE' },
  })
  if (existing) {
    return NextResponse.json({ error: 'Você já tem um acompanhamento ativo com este profissional' }, { status: 409 })
  }

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
    },
  })

  return NextResponse.json({ id: enrollment.id })
}
