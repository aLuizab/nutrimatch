import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'

// Editing a plan never touches existing enrollments — those carry their own price and
// consultation-count snapshots taken at enrollment time.
const updateSchema = z.object({
  name: z.string().trim().min(3, 'Dê um nome ao programa').optional(),
  description: z.string().trim().max(600, 'Descrição muito longa').optional(),
  durationMonths: z.coerce.number().int().min(1).max(24).optional(),
  consultations: z.coerce.number().int().min(2).max(52).optional(),
  pricePerConsultation: z.coerce.number().int().min(1, 'Valor inválido').optional(),
  active: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let user
  try {
    user = await requireRole('PROFESSIONAL')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const json = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const plan = await prisma.carePlan.findUnique({ where: { id } })
  if (!plan) return NextResponse.json({ error: 'Programa não encontrado' }, { status: 404 })
  if (plan.professionalId !== user.professional!.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const price = parsed.data.pricePerConsultation
  if (price !== undefined && price >= user.professional!.price) {
    return NextResponse.json(
      { error: `O valor por consulta deve ser menor que o seu valor avulso (R$ ${user.professional!.price})` },
      { status: 400 }
    )
  }

  await prisma.carePlan.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ ok: true })
}
