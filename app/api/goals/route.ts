import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { unexpectedFailure } from '@/lib/api-failures'
import { canManageGoalsFor } from '@/lib/goals'

const createSchema = z.object({
  // Ausente significa "para mim": e o caso do paciente criando a propria meta.
  patientId: z.string().min(1).optional(),
  title: z.string().trim().min(3, 'Descreva a meta em pelo menos 3 caracteres').max(120),
  description: z.string().trim().max(500).optional(),
  targetValue: z.coerce.number().optional(),
  currentValue: z.coerce.number().optional(),
  unit: z.string().trim().max(12).optional(),
  dueDate: z.string().trim().optional(),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })

  const limited = guardMutation(user.id, 'goals')
  if (limited) return limited

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados invalidos' }, { status: 400 })
  }
  const data = parsed.data

  const patientId = data.patientId ?? user.patient?.id
  if (!patientId) {
    return NextResponse.json({ error: 'Nenhum paciente informado' }, { status: 400 })
  }

  try {
    if (!(await canManageGoalsFor(patientId, user))) {
      // 404 e nao 403: responder "sem permissao" confirmaria que aquele paciente existe.
      return NextResponse.json({ error: 'Paciente nao encontrado' }, { status: 404 })
    }

    const goal = await prisma.goal.create({
      data: {
        patientId,
        authorId: user.id,
        title: data.title,
        description: data.description || null,
        targetValue: data.targetValue ?? null,
        currentValue: data.currentValue ?? null,
        // Gravado uma vez, na criacao, e nunca mais tocado: e a regua contra a qual todo o
        // progresso futuro e medido.
        startValue: data.currentValue ?? null,
        unit: data.unit || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    })
    return NextResponse.json({ goal })
  } catch (e) {
    return unexpectedFailure('goals-create', e)
  }
}
