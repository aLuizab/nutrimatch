import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'
import { instantAt, spDateString, addDaysToDateString } from '@/lib/spdate'

// Bounds exist so one fat-fingered "785" can't permanently wreck the chart's scale.
const progressSchema = z
  .object({
    recordedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
    weightKg: z.number().min(20, 'Peso fora do intervalo').max(400, 'Peso fora do intervalo').optional(),
    waistCm: z.number().min(30, 'Cintura fora do intervalo').max(300, 'Cintura fora do intervalo').optional(),
    note: z.string().trim().max(500, 'Anotação muito longa').optional(),
  })
  .refine((d) => d.weightKg !== undefined || d.waistCm !== undefined, {
    message: 'Informe ao menos o peso ou a cintura',
  })

export async function POST(request: Request) {
  let user
  try {
    user = await requireRole('PATIENT')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const json = await request.json().catch(() => null)
  const parsed = progressSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const { recordedAt, weightKg, waistCm, note } = parsed.data

  const today = spDateString(new Date())
  if (recordedAt > today) {
    return NextResponse.json({ error: 'Não é possível registrar uma medida no futuro' }, { status: 400 })
  }
  if (recordedAt < addDaysToDateString(today, -365 * 5)) {
    return NextResponse.json({ error: 'Data muito antiga' }, { status: 400 })
  }

  try {
    await prisma.progressEntry.create({
      data: {
        patientId: user.patient!.id,
        // instantAt (UTC-3), never new Date('YYYY-MM-DD') — the latter is UTC midnight and
        // formatDateBR would render it as the previous day.
        recordedAt: instantAt(recordedAt, '00:00'),
        weightKg: weightKg ?? null,
        waistCm: waistCm ?? null,
        note: note || null,
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'Você já registrou uma medida nesta data' }, { status: 409 })
    }
    throw e
  }

  return NextResponse.json({ ok: true })
}
