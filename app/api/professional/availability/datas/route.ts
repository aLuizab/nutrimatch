import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { BOOKING_HORIZON_DAYS } from '@/lib/availability'
import { addDaysToDateString, spDateString } from '@/lib/spdate'

// Exceções de uma data: fechar o dia, ou atender num horário que não é o da semana.
//
// Rota separada da grade semanal de propósito. Aquela é reescrita inteira a cada salvamento
// (deleteMany + createMany); se as duas dividissem a mesma rota, salvar os horários da semana
// apagaria as férias marcadas antes. Aqui a granularidade é a data: um PUT substitui o que existe
// para aquele dia e não toca em nenhum outro.

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const MAX_BLOCKS = 4

const bodySchema = z
  .object({
    date: z.string().regex(DATE_RE, 'Data inválida'),
    closed: z.boolean().default(false),
    blocks: z
      .array(
        z
          .object({
            startTime: z.string().regex(TIME_RE, 'Horário inválido'),
            endTime: z.string().regex(TIME_RE, 'Horário inválido'),
          })
          .refine((b) => b.startTime < b.endTime, {
            message: 'O horário de início deve ser antes do término',
          })
      )
      .max(MAX_BLOCKS, `Máximo de ${MAX_BLOCKS} blocos de horário por dia`)
      .default([]),
  })
  .strict()
  .refine((d) => !(d.closed && d.blocks.length > 0), {
    message: 'Um dia fechado não tem horários. Escolha um dos dois.',
  })

/**
 * Grava a exceção de uma data. Sem `closed` e sem blocos, a data volta a seguir a semana — é
 * assim que se desfaz uma exceção, sem precisar de um DELETE próprio para "voltar ao normal".
 */
export async function PUT(request: Request) {
  let user
  try {
    user = await requireRole('PROFESSIONAL')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'availability-datas')
  if (limited) return limited

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const { date, closed, blocks } = parsed.data

  // A janela é a mesma que o paciente consegue enxergar. Marcar férias para depois dela seria
  // guardar uma linha que nunca chega a valer, e que ninguém lembraria de ter criado.
  const hoje = spDateString(new Date())
  if (date < hoje) {
    return NextResponse.json({ error: 'Essa data já passou' }, { status: 400 })
  }
  if (date > addDaysToDateString(hoje, BOOKING_HORIZON_DAYS)) {
    return NextResponse.json(
      { error: 'A agenda abre para marcação com até 3 meses de antecedência' },
      { status: 400 }
    )
  }

  const ordenados = [...blocks].sort((a, b) => (a.startTime < b.startTime ? -1 : 1))
  for (let i = 1; i < ordenados.length; i++) {
    if (ordenados[i - 1].endTime > ordenados[i].startTime) {
      return NextResponse.json({ error: 'Horários sobrepostos nesta data' }, { status: 400 })
    }
  }

  const professionalId = user.professional!.id

  // Substitui o que havia para esta data, numa transação: um estado intermediário em que a data
  // ficou sem exceção nenhuma liberaria, por um instante, horários que a pessoa quis fechar.
  //
  // Forma de callback e não de array porque os três caminhos devolvem tipos diferentes de
  // operação, e o array de $transaction exige que todas sejam do mesmo tipo.
  await prisma.$transaction(async (tx) => {
    await tx.availabilityOverride.deleteMany({ where: { professionalId, date } })
    if (closed) {
      await tx.availabilityOverride.create({ data: { professionalId, date, closed: true } })
      return
    }
    if (ordenados.length > 0) {
      await tx.availabilityOverride.createMany({
        data: ordenados.map((b) => ({
          professionalId,
          date,
          startTime: b.startTime,
          endTime: b.endTime,
        })),
      })
    }
    // Nem fechado nem com blocos: a data volta a seguir a grade semanal, e o deleteMany acima
    // já é tudo o que isso significa.
  })

  return NextResponse.json({ ok: true })
}
