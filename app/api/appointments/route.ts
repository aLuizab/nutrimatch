import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'
import { isSlotAvailable } from '@/lib/availability'

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

  const professional = await prisma.professional.findUnique({ where: { id: professionalId } })
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
    // price is snapshotted from the professional's current price — later price edits by the
    // professional must not retroactively change already-booked appointments.
    const appointment = await prisma.appointment.create({
      data: {
        professionalId,
        patientId: user.patient!.id,
        scheduledAt: scheduledAtDate,
        modality,
        price: professional.price,
        phone: phone || null,
        reason: reason || null,
        status: 'CONFIRMED',
      },
    })
    return NextResponse.json({ id: appointment.id })
  } catch (e: unknown) {
    if (typeof e === 'object' && e !== null && 'code' in e && e.code === 'P2002') {
      return NextResponse.json({ error: 'Esse horário acabou de ser reservado. Escolha outro.' }, { status: 409 })
    }
    throw e
  }
}
