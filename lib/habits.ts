import { prisma } from './prisma'
import { addDaysToDateString, spDateString } from './spdate'

// Hábitos e a marcação diária deles.
//
// Um hábito não é uma meta pequena. Meta tem alvo e prazo, e um dia acaba; hábito não acaba — ele
// é marcado, dia após dia, e o que interessa nele é a constância. Por isso vive em tabela própria
// (ver o comentário do model Habit) e por isso a tela mostra uma faixa de dias, não uma barra de
// progresso rumo a um fim.

/** Quantos dias a faixa mostra. Sete: a semana é a unidade em que as pessoas pensam hábito. */
export const HABIT_WINDOW_DAYS = 7

/** Limite de hábitos ativos. Vinte hábitos não são acompanhados por ninguém — são uma lista. */
export const MAX_ACTIVE_HABITS = 12

export interface HabitDay {
  dateStr: string
  done: boolean
  /** Hoje recebe destaque na faixa: é o único dia que a pessoa vem marcar. */
  isToday: boolean
}

export interface HabitView {
  id: string
  name: string
  targetPerWeek: number | null
  days: HabitDay[]
  /** Quantos dos últimos HABIT_WINDOW_DAYS foram cumpridos. */
  doneInWindow: number
  /** Dias consecutivos cumpridos terminando hoje (ou em ontem, se hoje ainda não foi marcado). */
  streak: number
}

/** Os dias da faixa, do mais antigo para o mais recente, terminando hoje. */
export function habitWindow(today: string = spDateString(new Date())): string[] {
  return Array.from({ length: HABIT_WINDOW_DAYS }, (_, i) =>
    addDaysToDateString(today, i - (HABIT_WINDOW_DAYS - 1))
  )
}

/**
 * Sequência de dias cumpridos que termina hoje.
 *
 * Um dia ainda não marcado **não quebra** a sequência: às dez da manhã ninguém bebeu os dois
 * litros de água do dia, e zerar o número nessa hora transformaria a única métrica motivadora da
 * tela num castigo por acordar. A contagem então começa em ontem quando hoje está em branco.
 */
export function streakAte(marcados: Set<string>, today: string): number {
  let inicio = today
  if (!marcados.has(today)) {
    inicio = addDaysToDateString(today, -1)
    if (!marcados.has(inicio)) return 0
  }
  let n = 0
  let cursor = inicio
  while (marcados.has(cursor)) {
    n++
    cursor = addDaysToDateString(cursor, -1)
  }
  return n
}

/**
 * Os hábitos ativos de um paciente, com a faixa de dias montada.
 *
 * Busca os logs de uma janela maior que a exibida (60 dias) porque a sequência pode ser mais longa
 * que a faixa — e um número de sequência que para em 7 por causa do recorte da consulta contaria
 * uma inverdade sobre o esforço de quem está há um mês firme.
 */
export async function getHabits(patientId: string, today: string = spDateString(new Date())): Promise<HabitView[]> {
  const janela = habitWindow(today)
  const desde = addDaysToDateString(today, -60)

  const habits = await prisma.habit.findMany({
    where: { patientId, active: true },
    orderBy: { createdAt: 'asc' },
    include: {
      logs: { where: { date: { gte: desde, lte: today } }, select: { date: true } },
    },
  })

  return habits.map((h) => {
    const marcados = new Set(h.logs.map((l) => l.date))
    const days = janela.map((dateStr) => ({
      dateStr,
      done: marcados.has(dateStr),
      isToday: dateStr === today,
    }))
    return {
      id: h.id,
      name: h.name,
      targetPerWeek: h.targetPerWeek,
      days,
      doneInWindow: days.filter((d) => d.done).length,
      streak: streakAte(marcados, today),
    }
  })
}
