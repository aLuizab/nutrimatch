import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { isWithinWithdrawalWindow, refundEnrollmentWithdrawal } from '@/lib/payments'
import { formatCents } from '@/lib/money'

const cancelSchema = z.object({ status: z.literal('CANCELLED') })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const limited = guardMutation(user.id, 'enrollment-update')
  if (limited) return limited

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

  // Direito de arrependimento (CDC art. 49): só o próprio paciente pode invocá-lo — é um
  // direito do consumidor, não algo que um cancelamento pelo profissional aciona. Fora da
  // janela de 7 dias, refundEnrollmentWithdrawal não faz nada e o cancelamento segue sem
  // devolução automática, como sempre funcionou.
  let refundedCents = 0
  if (isOwningPatient && enrollment.paymentIntentId && isWithinWithdrawalWindow(enrollment.paidAt)) {
    const outcome = await refundEnrollmentWithdrawal(id)
    refundedCents = outcome?.refundedCents ?? 0
  }

  // Appointments are deliberately untouched: they were booked in good faith at a price the
  // patient was shown, and Appointment.price is a snapshot by design.
  await prisma.enrollment.update({ where: { id }, data: { status: 'CANCELLED' } })
  return NextResponse.json({
    ok: true,
    refunded: refundedCents > 0,
    refundedLabel: refundedCents > 0 ? formatCents(refundedCents) : null,
  })
}
