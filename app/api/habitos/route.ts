import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requirePatientActor } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { MAX_ACTIVE_HABITS } from '@/lib/habits'

// Criar e arquivar hábito. A marcação diária é outra rota (/api/habitos/[id]/dias): criar um
// hábito é raro, marcá-lo é diário, e são volumes e limites de taxa bem diferentes.

const criarSchema = z
  .object({
    name: z.string().trim().min(2, 'Dê um nome ao hábito').max(60, 'Nome muito longo'),
    // 1..7: hábito é coisa de semana. Zero não é meta, e mais de sete dias por semana não existe.
    targetPerWeek: z.coerce.number().int().min(1).max(7).optional(),
  })
  .strict()

export async function POST(request: Request) {
  let user
  try {
    user = await requirePatientActor()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'habito-criar')
  if (limited) return limited

  const parsed = criarSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const patientId = user.patient!.id
  const ativos = await prisma.habit.count({ where: { patientId, active: true } })
  if (ativos >= MAX_ACTIVE_HABITS) {
    return NextResponse.json(
      { error: `Você já tem ${MAX_ACTIVE_HABITS} hábitos em acompanhamento. Arquive um para incluir outro.` },
      { status: 409 }
    )
  }

  const habit = await prisma.habit.create({
    data: {
      patientId,
      name: parsed.data.name,
      targetPerWeek: parsed.data.targetPerWeek ?? null,
    },
    select: { id: true },
  })

  return NextResponse.json({ id: habit.id })
}
