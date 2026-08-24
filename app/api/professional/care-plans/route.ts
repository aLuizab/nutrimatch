import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'

const planSchema = z.object({
  name: z.string().trim().min(3, 'Dê um nome ao programa'),
  description: z.string().trim().max(600, 'Descrição muito longa').optional(),
  durationMonths: z.coerce.number().int().min(1, 'Duração mínima de 1 mês').max(24, 'Duração máxima de 24 meses'),
  consultations: z.coerce.number().int().min(2, 'Um programa precisa de ao menos 2 consultas').max(52, 'Número de consultas muito alto'),
  pricePerConsultation: z.coerce.number().int().min(1, 'Valor inválido'),
})

export async function POST(request: Request) {
  let user
  try {
    user = await requireRole('PROFESSIONAL')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const json = await request.json().catch(() => null)
  const parsed = planSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const data = parsed.data

  // The whole point of a program is a better per-consultation price than the one-off rate.
  if (data.pricePerConsultation >= user.professional!.price) {
    return NextResponse.json(
      { error: `O valor por consulta deve ser menor que o seu valor avulso (R$ ${user.professional!.price})` },
      { status: 400 }
    )
  }

  const plan = await prisma.carePlan.create({
    data: {
      professionalId: user.professional!.id,
      name: data.name,
      description: data.description || '',
      durationMonths: data.durationMonths,
      consultations: data.consultations,
      pricePerConsultation: data.pricePerConsultation,
    },
  })

  return NextResponse.json({ id: plan.id })
}
