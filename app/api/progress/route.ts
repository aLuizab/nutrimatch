import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AuthError, requirePatientActor } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { instantAt, spDateString, addDaysToDateString } from '@/lib/spdate'

// Bounds exist so one fat-fingered "785" can't permanently wreck the chart's scale.
//
// Toda medida é opcional, e isso é a regra e não uma frouxidão: ninguém mede tudo sempre. Quem
// acompanha emagrecimento anota peso e cintura; quem acompanha ganho de massa anota braço e coxa.
// Exigir o conjunto inteiro faria a pessoa inventar número para preencher campo, e número
// inventado num histórico de saúde é pior que campo vazio.
const cm = (nome: string) =>
  z.number().min(10, `${nome} fora do intervalo`).max(300, `${nome} fora do intervalo`).optional()

const progressSchema = z
  .object({
    recordedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
    weightKg: z.number().min(20, 'Peso fora do intervalo').max(400, 'Peso fora do intervalo').optional(),

    // Composição corporal
    bodyFatPercent: z
      .number()
      .min(1, 'Percentual de gordura fora do intervalo')
      .max(70, 'Percentual de gordura fora do intervalo')
      .optional(),
    leanMassKg: z
      .number()
      .min(10, 'Massa magra fora do intervalo')
      .max(200, 'Massa magra fora do intervalo')
      .optional(),

    // Circunferências
    waistCm: cm('Cintura'),
    hipCm: cm('Quadril'),
    chestCm: cm('Tórax'),
    armCm: cm('Braço'),
    thighCm: cm('Coxa'),

    note: z.string().trim().max(500, 'Anotação muito longa').optional(),
  })
  .refine(
    (d) =>
      [
        d.weightKg,
        d.bodyFatPercent,
        d.leanMassKg,
        d.waistCm,
        d.hipCm,
        d.chestCm,
        d.armCm,
        d.thighCm,
      ].some((v) => v !== undefined),
    { message: 'Informe ao menos uma medida' }
  )

export async function POST(request: Request) {
  let user
  try {
    user = await requirePatientActor()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'progress-create')
  if (limited) return limited

  const json = await request.json().catch(() => null)
  const parsed = progressSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const { recordedAt, note, ...medidas } = parsed.data

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
        // `?? null` em cada uma: Prisma trata `undefined` como "não mexer", que numa criação dá
        // no mesmo, mas deixaria de zerar o campo se este objeto passar a ser reusado num update.
        weightKg: medidas.weightKg ?? null,
        bodyFatPercent: medidas.bodyFatPercent ?? null,
        leanMassKg: medidas.leanMassKg ?? null,
        waistCm: medidas.waistCm ?? null,
        hipCm: medidas.hipCm ?? null,
        chestCm: medidas.chestCm ?? null,
        armCm: medidas.armCm ?? null,
        thighCm: medidas.thighCm ?? null,
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
