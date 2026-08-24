import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

const cancelSchema = z.object({ status: z.literal('CANCELLED') })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const json = await request.json().catch(() => null)
  const parsed = cancelSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })

  const enrollment = await prisma.enrollment.findUnique({ where: { id } })
  if (!enrollment) return NextResponse.json({ error: 'Acompanhamento não encontrado' }, { status: 404 })

  const isOwningPatient = user.role === 'PATIENT' && user.patient?.id === enrollment.patientId
  const isOwningProfessional = user.role === 'PROFESSIONAL' && user.professional?.id === enrollment.professionalId
  if (!isOwningPatient && !isOwningProfessional) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  if (enrollment.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Este acompanhamento já foi encerrado' }, { status: 400 })
  }

  // Appointments are deliberately untouched: they were booked in good faith at a price the
  // patient was shown, and Appointment.price is a snapshot by design.
  await prisma.enrollment.update({ where: { id }, data: { status: 'CANCELLED' } })
  return NextResponse.json({ ok: true })
}
