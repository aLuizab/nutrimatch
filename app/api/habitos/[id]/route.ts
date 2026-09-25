import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, requirePatientActor } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'

// Arquivar um hábito.
//
// DELETE arquiva, não apaga. Apagar levaria consigo todos os dias em que a pessoa cumpriu aquele
// hábito, e esse histórico é a única coisa que ele produziu — jogá-lo fora porque ela quer parar
// de acompanhar seria apagar o esforço junto com a intenção.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user
  try {
    user = await requirePatientActor()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'habito-arquivar')
  if (limited) return limited

  const { id } = await params
  // updateMany com o dono no where: é a autorização e a escrita na mesma operação, sem uma
  // leitura no meio em que o hábito de outra pessoa poderia passar.
  const { count } = await prisma.habit.updateMany({
    where: { id, patientId: user.patient!.id, active: true },
    data: { active: false },
  })
  if (count === 0) return NextResponse.json({ error: 'Hábito não encontrado' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
