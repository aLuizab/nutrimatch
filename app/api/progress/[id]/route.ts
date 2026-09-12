import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, requirePatientActor } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'

// Patients mistype measurements; without a delete the only fix would be a database edit.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let user
  try {
    user = await requirePatientActor()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'progress-delete')
  if (limited) return limited

  const entry = await prisma.progressEntry.findUnique({ where: { id } })
  if (!entry) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })
  if (entry.patientId !== user.patient!.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  await prisma.progressEntry.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
