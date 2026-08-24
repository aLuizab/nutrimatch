import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { notifyCancelled } from '@/lib/notifications'

// Two mutually exclusive actions share this route: cancelling (either owner, future
// appointments only) and writing the post-consultation summary (owning professional,
// past appointments only).
const actionSchema = z.union([
  z.object({ status: z.literal('CANCELLED') }).strict(),
  z.object({ summary: z.string().trim().min(1, 'O resumo não pode ficar vazio').max(4000) }).strict(),
])

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: { include: { user: { select: { id: true, name: true, email: true } } } },
      professional: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  })
  if (!appointment) return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })

  const isOwningPatient = user.role === 'PATIENT' && user.patient?.id === appointment.patientId
  const isOwningProfessional = user.role === 'PROFESSIONAL' && user.professional?.id === appointment.professionalId
  if (!isOwningPatient && !isOwningProfessional) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const json = await request.json().catch(() => null)
  const parsed = actionSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }
  const action = parsed.data
  const now = new Date()

  if ('status' in action) {
    if (appointment.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Esta consulta já foi cancelada' }, { status: 400 })
    }
    if (appointment.scheduledAt <= now) {
      return NextResponse.json({ error: 'Não é possível cancelar uma consulta já realizada' }, { status: 400 })
    }
    // slotHeldAt: null frees the slot immediately — see the schema comment on this column.
    await prisma.appointment.update({ where: { id }, data: { status: 'CANCELLED', slotHeldAt: null } })

    notifyCancelled(
      {
        scheduledAt: appointment.scheduledAt,
        modality: appointment.modality,
        price: appointment.price,
        patientName: appointment.patient.user.name,
        patientEmail: appointment.patient.user.email,
        professionalName: appointment.professional.user.name,
        professionalEmail: appointment.professional.user.email,
        professionalUserId: appointment.professional.user.id,
      },
      isOwningPatient ? 'PATIENT' : 'PROFESSIONAL'
    )

    return NextResponse.json({ ok: true })
  }

  if (!isOwningProfessional) {
    return NextResponse.json({ error: 'Apenas o profissional pode escrever o resumo' }, { status: 403 })
  }
  if (appointment.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Consulta cancelada não tem resumo' }, { status: 400 })
  }
  if (appointment.scheduledAt > now) {
    return NextResponse.json({ error: 'O resumo só pode ser escrito após a consulta' }, { status: 400 })
  }
  await prisma.appointment.update({ where: { id }, data: { summary: action.summary } })
  return NextResponse.json({ ok: true })
}
