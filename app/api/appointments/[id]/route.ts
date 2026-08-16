import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const appointment = await prisma.appointment.findUnique({ where: { id } })
  if (!appointment) return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })

  const isOwningPatient = user.role === 'PATIENT' && user.patient?.id === appointment.patientId
  const isOwningProfessional = user.role === 'PROFESSIONAL' && user.professional?.id === appointment.professionalId
  if (!isOwningPatient && !isOwningProfessional) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  if (body.status !== 'CANCELLED') {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }

  await prisma.appointment.update({ where: { id }, data: { status: 'CANCELLED' } })
  return NextResponse.json({ ok: true })
}
