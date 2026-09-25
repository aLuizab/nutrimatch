import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AuthError, requireRole } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'
import { markPayoutSent } from '@/lib/payouts'

// Registrar que a transferência saiu. A transferência em si acontece fora daqui, no app do
// banco — o que esta rota grava é que ela aconteceu, com data e responsável.
//
// Ela **não** conclui o repasse. Concluir exige comprovante anexado, e isso é POST
// .../comprovante: sem documento, "já te paguei" é só a palavra de quem pagou. O que existe aqui
// é o estado do meio — "mandei, o comprovante vem" — que é justamente o que o profissional
// precisa ver para não confundir uma transferência feita numa sexta à noite com uma que nunca
// saiu.
const bodySchema = z.object({
  action: z.literal('MARK_SENT'),
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

  const falha = await markPayoutSent(id, admin.id, parsed.data.note)
  if (falha) return NextResponse.json({ error: falha.error }, { status: falha.status })

  // Sem e-mail aqui, de propósito: o aviso ao profissional sai quando o repasse é concluído, com
  // o comprovante anexado. Avisar duas vezes sobre o mesmo dinheiro — uma sem documento — é como
  // o segundo aviso, que é o que importa, passa a ser ignorado.
  audit({
    actorId: admin.id,
    actorRole: 'ADMIN',
    action: 'PAYOUT_MARKED_SENT',
    subjectId: id,
    metadata: { payoutId: id },
  })

  return NextResponse.json({ ok: true })
}
