import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'

// Remover um compromisso da agenda própria.
//
// Aqui apagar é o certo, ao contrário de um hábito arquivado ou de um repasse cancelado: um
// compromisso que ele tirou da agenda não deixou nada para trás — nenhum paciente contou com
// ele, nenhum dinheiro passou por ele. Guardar seria acumular lixo com cara de histórico.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user
  try {
    user = await requireRole('PROFESSIONAL')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'agenda-propria')
  if (limited) return limited

  const { id } = await params
  // O dono entra no where: autorização e escrita na mesma operação, sem uma leitura no meio em
  // que o compromisso de outra pessoa poderia passar.
  const { count } = await prisma.agendaEntry.deleteMany({
    where: { id, professionalId: user.professional!.id },
  })
  if (count === 0) return NextResponse.json({ error: 'Compromisso não encontrado' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
