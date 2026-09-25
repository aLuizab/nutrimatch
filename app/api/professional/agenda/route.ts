import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { BOOKING_HORIZON_DAYS } from '@/lib/availability'
import { addDaysToDateString, instantAt, spDateString } from '@/lib/spdate'

// A agenda que o profissional mantém por conta própria: consulta combinada fora da plataforma,
// ou compromisso que simplesmente ocupa o horário.
//
// O efeito prático é o mesmo nos dois casos — o horário sai da disponibilidade (ver
// lib/availability.ts). A distinção existe para a agenda dele fazer sentido daqui a um mês, e não
// para a regra mudar.

const DURACAO_MAXIMA_HORAS = 12

const criarSchema = z
  .object({
    kind: z.enum(['CONSULTA_EXTERNA', 'COMPROMISSO']),
    title: z.string().trim().min(2, 'Dê um nome ao compromisso').max(120, 'Nome muito longo'),
    // 'YYYY-MM-DD' e 'HH:MM', e não um ISO pronto: o profissional escolhe hora de parede em São
    // Paulo, e deixar o navegador montar o instante é como um fuso diferente no celular dele vira
    // uma consulta marcada na hora errada. Ver lib/spdate.ts.
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido'),
    modality: z.enum(['ONLINE', 'PRESENCIAL']).optional(),
    note: z.string().trim().max(300, 'Observação muito longa').optional(),
  })
  .strict()
  .refine((d) => d.startTime < d.endTime, {
    message: 'O horário de início deve ser antes do término',
  })

export async function POST(request: Request) {
  let user
  try {
    user = await requireRole('PROFESSIONAL')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'agenda-propria')
  if (limited) return limited

  const parsed = criarSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const { kind, title, date, startTime, endTime, modality, note } = parsed.data

  const hoje = spDateString(new Date())
  if (date > addDaysToDateString(hoje, BOOKING_HORIZON_DAYS)) {
    return NextResponse.json(
      { error: 'A agenda vai até 3 meses à frente. Escolha uma data dentro desse prazo.' },
      { status: 400 }
    )
  }

  const startsAt = instantAt(date, startTime)
  const endsAt = instantAt(date, endTime)
  if (endsAt.getTime() - startsAt.getTime() > DURACAO_MAXIMA_HORAS * 3600_000) {
    return NextResponse.json(
      { error: `Um compromisso pode durar no máximo ${DURACAO_MAXIMA_HORAS} horas. Para um dia inteiro, feche a data em Disponibilidade.` },
      { status: 400 }
    )
  }

  const professionalId = user.professional!.id

  // Um compromisso por cima de uma consulta já marcada não é impedido, mas também não passa em
  // silêncio: o horário já foi vendido a alguém, e quem precisa decidir o que fazer é ele — a
  // plataforma não vai cancelar a consulta de um paciente por causa disto.
  const conflito = await prisma.appointment.findFirst({
    where: {
      professionalId,
      status: { in: ['CONFIRMED', 'AWAITING_CONFIRMATION'] },
      scheduledAt: { gte: startsAt, lt: endsAt },
    },
    include: { patient: { include: { user: { select: { name: true } } } } },
  })

  const entry = await prisma.agendaEntry.create({
    data: {
      professionalId,
      kind,
      title,
      startsAt,
      endsAt,
      modality: kind === 'CONSULTA_EXTERNA' ? (modality ?? null) : null,
      note: note || null,
    },
    select: { id: true },
  })

  return NextResponse.json({
    id: entry.id,
    aviso: conflito
      ? `Atenção: você já tem uma consulta da plataforma com ${conflito.patient.user.name} nesse intervalo. Ela continua marcada — cancele por lá se for o caso.`
      : null,
  })
}
