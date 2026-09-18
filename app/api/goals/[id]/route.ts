import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { unexpectedFailure } from '@/lib/api-failures'
import { canManageGoalsFor } from '@/lib/goals'

const patchSchema = z.object({
  currentValue: z.coerce.number().optional(),
  status: z.enum(['ACTIVE', 'ACHIEVED', 'ABANDONED']).optional(),
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  targetValue: z.coerce.number().optional(),
  unit: z.string().trim().max(12).optional(),
  dueDate: z.string().trim().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })

  const limited = guardMutation(user.id, 'goals')
  if (limited) return limited

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 })

  try {
    const goal = await prisma.goal.findUnique({ where: { id } })
    if (!goal || !(await canManageGoalsFor(goal.patientId, user))) {
      return NextResponse.json({ error: 'Meta nao encontrada' }, { status: 404 })
    }

    const d = parsed.data
    const updated = await prisma.goal.update({
      where: { id },
      data: {
        ...(d.currentValue !== undefined ? { currentValue: d.currentValue } : {}),
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.description !== undefined ? { description: d.description || null } : {}),
        ...(d.targetValue !== undefined ? { targetValue: d.targetValue } : {}),
        ...(d.unit !== undefined ? { unit: d.unit || null } : {}),
        ...(d.dueDate !== undefined ? { dueDate: d.dueDate ? new Date(d.dueDate) : null } : {}),
        ...(d.status !== undefined
          ? {
              status: d.status,
              // Carimbado ao concluir e limpado ao reabrir, senao uma meta reaberta continua
              // exibindo a data em que foi concluida da primeira vez.
              achievedAt: d.status === 'ACHIEVED' ? new Date() : null,
            }
          : {}),
      },
    })
    return NextResponse.json({ goal: updated })
  } catch (e) {
    return unexpectedFailure('goals-update', e)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })

  const limited = guardMutation(user.id, 'goals')
  if (limited) return limited

  const { id } = await params
  try {
    const goal = await prisma.goal.findUnique({ where: { id } })
    if (!goal || !(await canManageGoalsFor(goal.patientId, user))) {
      return NextResponse.json({ error: 'Meta nao encontrada' }, { status: 404 })
    }
    // So quem criou apaga. Uma meta que o nutricionista definiu faz parte do plano dele, e o
    // paciente sumir com ela nao desfaz o combinado — desistir e marcar como abandonada, que
    // fica registrado. O contrario tambem vale.
    if (goal.authorId !== user.id) {
      return NextResponse.json(
        { error: 'So quem criou a meta pode apaga-la. Voce pode marca-la como abandonada.' },
        { status: 403 }
      )
    }
    await prisma.goal.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return unexpectedFailure('goals-delete', e)
  }
}
