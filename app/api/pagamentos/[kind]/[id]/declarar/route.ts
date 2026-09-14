import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requirePatientActor } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'

// O paciente declara que pagou. É aviso, não confirmação: move a cobrança da fila "aguardando
// pagamento" para a fila "conferir extrato", e nada além disso. Quem confirma é humano, do
// outro lado, olhando a conta — ver app/api/admin/pagamentos.
const bodySchema = z.object({ note: z.string().trim().max(200).optional() })

export async function POST(request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params
  if (kind !== 'consulta' && kind !== 'pacote') {
    return NextResponse.json({ error: 'Tipo de cobrança inválido' }, { status: 404 })
  }

  let user
  try {
    user = await requirePatientActor()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'pix-claim')
  if (limited) return limited

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const note = parsed.data.note ?? null
  const now = new Date()

  if (kind === 'consulta') {
    const appointment = await prisma.appointment.findUnique({ where: { id } })
    if (!appointment || appointment.patientId !== user.patient!.id) {
      return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 })
    }
    if (appointment.paymentStatus === 'PAID') {
      return NextResponse.json({ error: 'Esta consulta já está paga' }, { status: 409 })
    }
    if (appointment.paymentStatus !== 'PENDING' && appointment.paymentStatus !== 'AWAITING_REVIEW') {
      return NextResponse.json({ error: 'Esta cobrança não está aberta' }, { status: 409 })
    }

    await prisma.appointment.update({
      where: { id },
      data: {
        paymentStatus: 'AWAITING_REVIEW',
        pixClaimedAt: appointment.pixClaimedAt ?? now,
        pixClaimNote: note,
        // Enquanto a conferência acontece o horário continua reservado: seria injusto liberar a
        // vaga de quem diz ter pago só porque a conferência é manual e demora.
        paymentDeadline: null,
      },
    })
    return NextResponse.json({ ok: true })
  }

  const enrollment = await prisma.enrollment.findUnique({ where: { id } })
  if (!enrollment || enrollment.patientId !== user.patient!.id) {
    return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 })
  }
  if (enrollment.status !== 'PENDING_PAYMENT') {
    return NextResponse.json({ error: 'Esta cobrança não está aberta' }, { status: 409 })
  }

  await prisma.enrollment.update({
    where: { id },
    data: { pixClaimedAt: enrollment.pixClaimedAt ?? now, pixClaimNote: note },
  })
  return NextResponse.json({ ok: true })
}
