import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'

// Marcar o repasse como pago. A transferência em si acontece fora daqui, no app do banco — o
// que esta rota registra é que ela aconteceu, com data e responsável. Sem isso, "já paguei o
// fulano?" só teria resposta no extrato, e o profissional não teria como acompanhar nada.
const bodySchema = z.object({
  action: z.literal('MARK_PAID'),
  note: z.string().trim().max(200).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin
  try {
    admin = await requireRole('ADMIN')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(admin.id, 'admin-repasse')
  if (limited) return limited

  const { id } = await params
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })

  const payout = await prisma.payout.findUnique({ where: { id } })
  if (!payout) return NextResponse.json({ error: 'Repasse não encontrado' }, { status: 404 })
  if (payout.status === 'PAID') return NextResponse.json({ ok: true, alreadyPaid: true })
  if (payout.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Este repasse foi cancelado' }, { status: 409 })
  }

  await prisma.payout.update({
    where: { id },
    data: { status: 'PAID', paidAt: new Date(), paidBy: admin.id, note: parsed.data.note ?? null },
  })

  audit({
    actorId: admin.id,
    actorRole: 'ADMIN',
    action: 'PAYOUT_MARKED_PAID',
    subjectId: payout.professionalId,
    metadata: { payoutId: id, netCents: payout.netCents },
  })

  return NextResponse.json({ ok: true })
}
