import { prisma } from './prisma'
import { addDaysToDateString, instantAt, spDateString, weekdayOf } from './spdate'
import { slotOccupiedWhere } from './appointment-status'

// Que horários um profissional tem livres, e até quando dá para marcar.
//
// Duas fontes de verdade sobre QUANDO ele atende, nesta ordem de precedência:
//
//   1. **Exceção da data** (AvailabilityOverride) — férias, feriado, um sábado fora do comum.
//      Uma exceção `closed` fecha o dia; blocos de horário numa data SUBSTITUEM a grade semanal
//      naquele dia, nunca somam.
//   2. **Grade semanal** (AvailabilityRule) — o padrão, para toda data sem exceção.
//
// E duas coisas que ocupam horário dentro do que ele atende:
//
//   - **Consulta da plataforma** (Appointment) — marcada por um paciente aqui.
//   - **Agenda própria** (AgendaEntry) — consulta combinada fora da plataforma, ou compromisso
//     pessoal. Bloqueia igual: um horário já ocupado não fica livre só porque o dinheiro dele não
//     passou por aqui. Sem isto, a plataforma marcaria por cima do consultório dele.
//
// Nada disso roda em cron. O que está livre é derivado na leitura, do mesmo jeito que o resto
// do estado baseado em tempo neste projeto: uma reserva não confirmada deixa de ocupar o horário
// quando o prazo dela passa, sem nada precisar acontecer.

/**
 * Até onde a agenda abre para marcação: três meses.
 *
 * Era 21 dias, o que impedia qualquer retorno marcado com antecedência — justamente o caso mais
 * comum de um acompanhamento nutricional, que é mensal. O limite existe mesmo assim porque
 * agenda sem fim é agenda que ninguém consegue manter: quanto mais longe, menos a pessoa sabe se
 * vai poder atender.
 */
export const BOOKING_HORIZON_DAYS = 92

export interface AvailableDay {
  dateStr: string
  date: Date
  times: Date[]
}

interface TimeBlock {
  startTime: string
  endTime: string
  slotMinutes: number
}

/**
 * Os blocos que valem para uma data, já resolvida a precedência entre exceção e grade semanal.
 * Devolve lista vazia quando o dia está fechado ou não há regra nenhuma para ele.
 */
function blocksForDate(
  dateStr: string,
  weeklyRules: { weekday: number; startTime: string; endTime: string; slotMinutes: number }[],
  overridesByDate: Map<string, { closed: boolean; startTime: string | null; endTime: string | null }[]>,
  defaultSlotMinutes: number
): TimeBlock[] {
  const overrides = overridesByDate.get(dateStr)
  if (overrides?.length) {
    // Fechado vence tudo, inclusive outros blocos gravados para a mesma data. É a forma de dizer
    // "não atendo neste dia" sem ter de apagar mais nada.
    if (overrides.some((o) => o.closed)) return []
    const blocks = overrides
      .filter((o) => o.startTime && o.endTime)
      // A exceção diz QUANDO atender naquele dia, não por quanto tempo cada consulta dura: a
      // duração é uma escolha sobre como a pessoa trabalha, e não muda por causa de um sábado
      // fora do comum. Por isso ela herda a da grade semanal.
      .map((o) => ({ startTime: o.startTime!, endTime: o.endTime!, slotMinutes: defaultSlotMinutes }))
    if (blocks.length > 0) return blocks
  }
  return weeklyRules.filter((r) => r.weekday === weekdayOf(dateStr))
}

/**
 * Dias com pelo menos um horário livre, do mais próximo em diante.
 *
 * `daysWanted` limita quantos dias voltam, não até onde se procura: quem quer o calendário
 * inteiro pede BOOKING_HORIZON_DAYS, quem quer só os próximos pede 5.
 */
export async function getAvailableSlots(professionalId: string, daysWanted = 5): Promise<AvailableDay[]> {
  const now = new Date()
  const todayStr = spDateString(now)
  const lastDateStr = addDaysToDateString(todayStr, BOOKING_HORIZON_DAYS)

  const [rules, overrides, ocupados, existing] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { professionalId } }),
    prisma.availabilityOverride.findMany({
      where: { professionalId, date: { gte: todayStr, lte: lastDateStr } },
      select: { date: true, closed: true, startTime: true, endTime: true },
    }),
    // Tudo o que ele mesmo pôs na agenda e que toca a janela. A condição de sobreposição é
    // frouxa de propósito (começa antes do fim / termina depois do começo): um compromisso que
    // atravessa a meia-noite do último dia precisa aparecer.
    prisma.agendaEntry.findMany({
      where: {
        professionalId,
        endsAt: { gt: now },
        startsAt: { lte: instantAt(lastDateStr, '23:59') },
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.appointment.findMany({
      where: {
        professionalId,
        // slotHeldAt (not status) is the source of truth for "is this time taken" — it's null
        // the moment a booking is cancelled, freeing the slot immediately.
        slotHeldAt: { not: null, gte: now, lte: instantAt(lastDateStr, '23:59') },
        // …but an unconfirmed booking only holds its slot until the deadline. Past it the slot
        // is bookable again with nothing having to run — the expiry is derived here, and the
        // booking route clears the stale row inside its transaction before inserting.
        ...slotOccupiedWhere(now),
      },
      select: { scheduledAt: true },
    }),
  ])
  // Sem grade semanal e sem exceção não há agenda nenhuma a montar.
  if (rules.length === 0 && overrides.length === 0) return []

  const overridesByDate = new Map<string, typeof overrides>()
  for (const o of overrides) {
    const list = overridesByDate.get(o.date) ?? []
    list.push(o)
    overridesByDate.set(o.date, list)
  }

  const bookedTimes = new Set(existing.map((a) => a.scheduledAt.getTime()))
  // Intervalos em milissegundos, para a comparação no laço não repetir getTime() milhares de vezes.
  const bloqueios = ocupados.map((e) => [e.startsAt.getTime(), e.endsAt.getTime()] as const)
  // Duração que as exceções herdam. As regras semanais continuam usando a sua própria — elas
  // sempre carregaram uma por linha, e trocar isso por um valor global mudaria a agenda de quem
  // porventura tenha linhas com durações diferentes.
  const defaultSlotMinutes = rules[0]?.slotMinutes ?? 50

  const result: AvailableDay[] = []
  for (let offset = 0; result.length < daysWanted && offset <= BOOKING_HORIZON_DAYS; offset++) {
    const dateStr = addDaysToDateString(todayStr, offset)
    const blocks = blocksForDate(dateStr, rules, overridesByDate, defaultSlotMinutes)
    if (blocks.length === 0) continue

    const times: Date[] = []
    const seen = new Set<number>()
    for (const block of blocks) {
      const end = instantAt(dateStr, block.endTime)
      const step = block.slotMinutes * 60 * 1000
      let cursor = instantAt(dateStr, block.startTime)
      // The whole slot must fit inside the block — a slot that merely *starts* before the
      // block ends would spill into the next block and allow overlapping bookings.
      while (cursor.getTime() + step <= end.getTime()) {
        const inicio = cursor.getTime()
        const fim = inicio + step
        // Sobreposição de intervalos, e não igualdade de horário: um compromisso das 10h30 às
        // 11h30 tem de derrubar a vaga das 11h, que nem começa no mesmo minuto que ele.
        const ocupado = bloqueios.some(([de, ate]) => inicio < ate && fim > de)
        if (inicio > now.getTime() && !ocupado && !bookedTimes.has(inicio) && !seen.has(inicio)) {
          seen.add(inicio)
          times.push(new Date(cursor))
        }
        cursor = new Date(fim)
      }
    }
    times.sort((a, b) => a.getTime() - b.getTime())
    if (times.length > 0) {
      result.push({ dateStr, date: instantAt(dateStr, '00:00'), times })
    }
  }
  return result
}

export async function isSlotAvailable(professionalId: string, scheduledAt: Date) {
  const days = await getAvailableSlots(professionalId, BOOKING_HORIZON_DAYS)
  return days.some((day) => day.times.some((t) => t.getTime() === scheduledAt.getTime()))
}
