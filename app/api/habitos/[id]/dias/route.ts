import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AuthError, requirePatientActor } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { HABIT_WINDOW_DAYS } from '@/lib/habits'
import { addDaysToDateString, spDateString } from '@/lib/spdate'

// Marcar e desmarcar um dia.
//
// A existência da linha em HabitLog É o "cumpri". Não há coluna de estado porque não marcar e
// marcar como não feito são a mesma coisa para quem olha depois — e um terceiro estado só daria
// margem a duas leituras do mesmo silêncio.
const bodySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
    done: z.boolean(),
  })
  .strict()

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user
  try {
    user = await requirePatientActor()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'habito-marcar')
  if (limited) return limited

  const { id } = await params
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const { date, done } = parsed.data

  // Autorização junto da leitura: sem isto, o id de um hábito de outra pessoa seria suficiente
  // para marcar dias na conta dela.
  const habit = await prisma.habit.findFirst({
    where: { id, patientId: user.patient!.id, active: true },
    select: { id: true },
  })
  if (!habit) return NextResponse.json({ error: 'Hábito não encontrado' }, { status: 404 })

  // Só a janela exibida, e nunca o futuro. Marcar o dia de amanhã como cumprido é registrar algo
  // que não aconteceu, e a faixa da tela é a única coisa que a pessoa consegue enxergar de todo
  // jeito — aceitar uma data fora dela seria aceitar o que nenhum clique pode ter produzido.
  const hoje = spDateString(new Date())
  const primeiro = addDaysToDateString(hoje, -(HABIT_WINDOW_DAYS - 1))
  if (date > hoje) {
    return NextResponse.json({ error: 'Não é possível marcar um dia que ainda não aconteceu' }, { status: 400 })
  }
  if (date < primeiro) {
    return NextResponse.json({ error: 'Só os últimos dias podem ser ajustados' }, { status: 400 })
  }

  if (done) {
    try {
      await prisma.habitLog.create({ data: { habitId: id, date } })
    } catch (e) {
      // Já estava marcado. O clique repetido não é erro: a chave única é o que torna a marcação
      // idempotente, e o estado final é o que a pessoa pediu.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e
    }
  } else {
    await prisma.habitLog.deleteMany({ where: { habitId: id, date } })
  }

  return NextResponse.json({ ok: true, done })
}
