import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'
import { isSlotAvailable } from '@/lib/availability'
import { notifyBookingConfirmed } from '@/lib/notifications'
import { lockAndResolveEnrollment } from '@/lib/enrollments'

const bookingSchema = z.object({
  professionalId: z.string().min(1),
  scheduledAt: z.string().datetime(),
  modality: z.enum(['ONLINE', 'PRESENCIAL']),
  phone: z.string().trim().optional(),
  reason: z.string().trim().optional(),
})

export async function POST(request: Request) {
  let user
  try {
    user = await requireRole('PATIENT')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const json = await request.json().catch(() => null)
  const parsed = bookingSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const { professionalId, scheduledAt, modality, phone, reason } = parsed.data
  const scheduledAtDate = new Date(scheduledAt)

  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  if (!professional || professional.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Profissional indisponível' }, { status: 404 })
  }
  if (professional.modality !== 'AMBOS' && professional.modality !== modality) {
    return NextResponse.json({ error: 'Modalidade não disponível para este profissional' }, { status: 400 })
  }
  if (scheduledAtDate.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Horário inválido' }, { status: 400 })
  }

  const available = await isSlotAvailable(professionalId, scheduledAtDate)
  if (!available) {
    return NextResponse.json({ error: 'Esse horário acabou de ser reservado. Escolha outro.' }, { status: 409 })
  }

  try {
    // Enrollment resolution + the slot insert happen in one transaction: the row lock taken
    // on a candidate enrollment (if any — see lib/enrollments.ts) serializes concurrent
    // bookings against the same program, and the unique index on (professionalId, slotHeldAt)
    // is the final guard against two people winning the same time slot. Stripe is never
    // called inside this transaction — an external network call while holding a row lock is
    // how a lock ends up held for minutes instead of milliseconds.
    const appointment = await prisma.$transaction(async (tx) => {
      const active = await lockAndResolveEnrollment(tx, user.patient!.id, professionalId, scheduledAtDate)
      // price is snapshotted at booking time — later price edits by the professional, or the
      // program ending, must not retroactively change already-booked appointments.
      const price = active ? active.enrollment.pricePerConsultation : professional.price

      return tx.appointment.create({
        data: {
          professionalId,
          patientId: user.patient!.id,
          scheduledAt: scheduledAtDate,
          slotHeldAt: scheduledAtDate,
          modality,
          price,
          phone: phone || null,
          reason: reason || null,
          status: 'CONFIRMED',
          enrollmentId: active?.enrollment.id ?? null,
        },
      })
    })

    notifyBookingConfirmed({
      scheduledAt: scheduledAtDate,
      modality,
      price: appointment.price,
      patientName: user.name,
      patientEmail: user.email,
      professionalName: professional.user.name,
      professionalEmail: professional.user.email,
      professionalUserId: professional.user.id,
    })

    // price is echoed back so the confirmation screen can show what was actually charged —
    // the program price can stop applying between page render and submit.
    return NextResponse.json({
      id: appointment.id,
      price: appointment.price,
      enrollmentApplied: appointment.enrollmentId != null,
    })
  } catch (e: unknown) {
    if (typeof e === 'object' && e !== null && 'code' in e && e.code === 'P2002') {
      return NextResponse.json({ error: 'Esse horário acabou de ser reservado. Escolha outro.' }, { status: 409 })
    }
    throw e
  }
}
