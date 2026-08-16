import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const daySchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: z.string().regex(TIME_RE, 'Horário inválido'),
    endTime: z.string().regex(TIME_RE, 'Horário inválido'),
  })
  .refine((d) => d.startTime < d.endTime, { message: 'Horário de início deve ser antes do término' })

const availabilitySchema = z.object({
  slotMinutes: z.coerce.number().int().min(15, 'Mínimo 15 minutos').max(180, 'Máximo 180 minutos'),
  days: z.array(daySchema).min(1, 'Selecione ao menos um dia de atendimento'),
})

export async function PATCH(request: Request) {
  let user
  try {
    user = await requireRole('PROFESSIONAL')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const json = await request.json().catch(() => null)
  const parsed = availabilitySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const { slotMinutes, days } = parsed.data
  const professionalId = user.professional!.id

  // Simplest correct way to apply a full weekly schedule: replace the set. No other model
  // references AvailabilityRule rows, so this can't orphan anything.
  await prisma.$transaction([
    prisma.availabilityRule.deleteMany({ where: { professionalId } }),
    prisma.availabilityRule.createMany({
      data: days.map((d) => ({
        professionalId,
        weekday: d.weekday,
        startTime: d.startTime,
        endTime: d.endTime,
        slotMinutes,
      })),
    }),
  ])

  return NextResponse.json({ ok: true })
}
