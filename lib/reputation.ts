import type { AttendanceStatus } from '@prisma/client'
import { prisma } from './prisma'

// Dependência de mão única: ranking.ts importa daqui, nunca o contrário. Por isso este arquivo
// recebe a nota já encolhida como argumento em vez de chamar shrunkRating() — importar de
// ranking.ts fecharia um ciclo entre os dois módulos.

// Reputação das duas pontas da plataforma.
//
// A assimetria aqui é deliberada e é a decisão mais importante deste arquivo: **a reputação do
// profissional é pública, a do paciente não é**. Num marketplace de produtos as duas notas são
// visíveis, mas isto é saúde: uma nota de paciente exposta ao profissional vira, na prática, um
// filtro de quem consegue atendimento — e quem falta por estar doente, sem dinheiro ou sem
// transporte é exatamente quem mais precisa. Além do problema ético, é decisão automatizada
// sobre pessoa (LGPD art. 20).
//
// Por isso o paciente tem confiabilidade, mas ela só produz **limites estruturais** (quantos
// agendamentos abertos pode manter) e só é visível para ele mesmo. O profissional é protegido
// do prejuízo sem nunca receber uma nota para julgar quem atender.

// ── Comparecimento ────────────────────────────────────────────────────────────────────────

/**
 * Quanto tempo uma consulta passada fica esperando alguém marcar presença antes de ser tratada
 * como comparecida. O default é a favor do paciente de propósito: a marcação depende de uma
 * ação do profissional, e ninguém pode ter a reputação manchada porque o outro lado esqueceu.
 */
export const ATTENDANCE_AUTO_RESOLVE_DAYS = 7

/**
 * O comparecimento real de uma consulta, resolvendo PENDING vencido para ATTENDED na leitura.
 *
 * Derivado em vez de gravado por cron — mesmo padrão de `isExpiredAwaiting` em
 * lib/appointment-status.ts. Um cron a mais seria mais uma coisa para configurar, esquecer, e
 * descobrir quebrada meses depois com a reputação de todo mundo errada.
 */
export function effectiveAttendance(
  appointment: { attendance: AttendanceStatus; scheduledAt: Date; status: string },
  now: Date = new Date()
): AttendanceStatus {
  if (appointment.attendance !== 'PENDING') return appointment.attendance
  // Só consulta que chegou a ser confirmada pode ter comparecimento: cancelada ou expirada
  // nunca teve encontro para alguém faltar.
  if (appointment.status !== 'CONFIRMED') return 'PENDING'
  const deadline = appointment.scheduledAt.getTime() + ATTENDANCE_AUTO_RESOLVE_DAYS * 24 * 3600_000
  return now.getTime() >= deadline ? 'ATTENDED' : 'PENDING'
}

/** Consulta passada, confirmada e ainda sem marcação — o que o profissional precisa avaliar. */
export function awaitsAttendanceMark(
  appointment: { attendance: AttendanceStatus; scheduledAt: Date; status: string },
  now: Date = new Date()
): boolean {
  return (
    appointment.status === 'CONFIRMED' &&
    appointment.attendance === 'PENDING' &&
    appointment.scheduledAt.getTime() <= now.getTime()
  )
}

// ── Reputação do profissional ─────────────────────────────────────────────────────────────

/**
 * Confiabilidade: o profissional cumpre o que está marcado? 0..1.
 *
 * Uma falha só entra na conta: **cancelar uma consulta já marcada**. O paciente reorganizou o
 * dia por causa daquele horário, e é a pior coisa que o profissional pode fazer com ele. Pesa
 * dobrado por isso.
 *
 * Consulta EXPIRADA saiu desta conta, e a saída é o ponto. Enquanto o profissional precisava
 * aceitar, expirar significava que ele não respondeu — falha dele, e pesava simples. Hoje
 * expirar significa que o **paciente** não pagou, ou que a plataforma não conferiu o extrato a
 * tempo. Continuar contando isso contra o profissional seria rebaixá-lo no ranking pela
 * desistência de outra pessoa, sem que ele pudesse fazer nada a respeito.
 *
 * Sem histórico nenhum devolve 0.5: "desconhecido" fica no meio do pelotão, nunca no fundo —
 * quem não tem histórico não fez nada de errado.
 */
export const LATE_CANCELLATION_PENALTY = 2

export function reliabilityScore(input: { fulfilled: number; lateCancellations: number }): number {
  const failures = input.lateCancellations * LATE_CANCELLATION_PENALTY
  const total = input.fulfilled + failures
  if (total === 0) return 0.5
  return Math.max(0, Math.min(1, input.fulfilled / total))
}

/**
 * Pesos da reputação — separados dos de `lib/ranking.ts` de propósito, porque respondem a
 * perguntas diferentes. O rankScore ordena a busca e por isso inclui atividade recente; a
 * reputação diz se dá para confiar, e **inatividade não é falta de confiança**: quem passou
 * dois meses sem atender não ficou menos ético por isso, então recência não entra aqui.
 */
// Tempo de resposta saiu daqui pelo mesmo motivo que saiu de lib/ranking.ts: não existe mais
// um aceite do profissional para cronometrar. Os 0.15 foram para confiabilidade, não para a
// nota — reputação é sobre comportamento, e comportamento é o que ficou sem medida.
export const REPUTATION_WEIGHTS = {
  rating: 0.6,
  reliability: 0.4,
} as const

export function computeReputationScore(input: {
  /** Já encolhida pela média da plataforma — ver shrunkRating em lib/ranking.ts. */
  shrunkRating: number
  reliability: number
}): number {
  const ratingNorm = Math.max(0, Math.min(1, (input.shrunkRating - 1) / 4))
  const score =
    REPUTATION_WEIGHTS.rating * ratingNorm + REPUTATION_WEIGHTS.reliability * input.reliability
  return Math.round(score * 10000) / 10000
}

// ── Níveis ────────────────────────────────────────────────────────────────────────────────

export type Tier = 'NOVO' | 'CONFIAVEL' | 'DESTAQUE' | 'REFERENCIA'

export interface TierDefinition {
  id: Tier
  label: string
  /** Consultas realizadas exigidas. */
  minFulfilled: number
  /** Reputação exigida, 0..1. */
  minScore: number
  description: string
}

/**
 * Volume **e** qualidade, os dois obrigatórios — a mesma ideia do MercadoLíder. Nota alta com
 * três consultas não é reputação, é amostra pequena; e volume alto com nota ruim não deveria
 * render selo nenhum. Ordem crescente: `tierFor` percorre de trás para frente.
 */
export const TIERS: TierDefinition[] = [
  {
    id: 'NOVO',
    label: 'Novo',
    minFulfilled: 0,
    minScore: 0,
    description: 'Ainda construindo histórico na plataforma.',
  },
  {
    id: 'CONFIAVEL',
    label: 'Confiável',
    minFulfilled: 5,
    minScore: 0.6,
    description: 'Histórico consistente de consultas realizadas e boas avaliações.',
  },
  {
    id: 'DESTAQUE',
    label: 'Destaque',
    minFulfilled: 20,
    minScore: 0.75,
    description: 'Volume relevante, avaliações altas e pouquíssimas falhas.',
  },
  {
    id: 'REFERENCIA',
    label: 'Referência',
    minFulfilled: 50,
    minScore: 0.88,
    description: 'O topo da plataforma: muitas consultas, avaliações excelentes, sem falhas.',
  },
]

export function tierDefinition(tier: string): TierDefinition {
  return TIERS.find((t) => t.id === tier) ?? TIERS[0]
}

export function tierFor(reputationScore: number, fulfilledCount: number): Tier {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const t = TIERS[i]
    if (fulfilledCount >= t.minFulfilled && reputationScore >= t.minScore) return t.id
  }
  return 'NOVO'
}

/**
 * O que falta para o próximo nível — em itens concretos, não em percentual abstrato.
 *
 * É esta função que faz o sistema reter: um selo sozinho é decorativo, mas "faltam 3 consultas"
 * é uma meta acionável. Devolve null para quem já está no topo.
 */
export function nextTierProgress(
  reputationScore: number,
  fulfilledCount: number
): { next: TierDefinition; missing: string[] } | null {
  const current = tierFor(reputationScore, fulfilledCount)
  const currentIndex = TIERS.findIndex((t) => t.id === current)
  const next = TIERS[currentIndex + 1]
  if (!next) return null

  const missing: string[] = []
  const consultationsLeft = next.minFulfilled - fulfilledCount
  if (consultationsLeft > 0) {
    missing.push(
      consultationsLeft === 1 ? '1 consulta realizada' : `${consultationsLeft} consultas realizadas`
    )
  }
  if (reputationScore < next.minScore) {
    missing.push(`reputação de ${Math.round(next.minScore * 100)} (a sua está em ${Math.round(reputationScore * 100)})`)
  }
  return { next, missing }
}

// ── Confiabilidade do paciente (interna) ──────────────────────────────────────────────────

export type PatientReliabilityLevel = 'REGULAR' | 'ATENCAO' | 'RESTRITO'

/** Janela recente considerada. Faltas antigas saem da conta: histórico não é sentença. */
export const PATIENT_HISTORY_WINDOW = 10

export interface PatientReliability {
  level: PatientReliabilityLevel
  attended: number
  noShow: number
  /** 0..1, ou null para quem ainda não tem consulta passada nenhuma. */
  rate: number | null
}

export function patientReliability(input: { attended: number; noShow: number }): PatientReliability {
  const total = input.attended + input.noShow
  const rate = total === 0 ? null : input.attended / total
  // Contagem absoluta de faltas, não taxa: duas faltas em duas consultas e duas em dez são
  // problemas de tamanho diferente para a agenda de quem ficou esperando, mas ambas merecem
  // o limite. A taxa fica para exibir ao paciente, não para decidir.
  let level: PatientReliabilityLevel = 'REGULAR'
  if (input.noShow >= 3) level = 'RESTRITO'
  else if (input.noShow >= 2) level = 'ATENCAO'

  return { level, attended: input.attended, noShow: input.noShow, rate }
}

/**
 * Quantos agendamentos futuros em aberto o paciente pode manter ao mesmo tempo. null = sem
 * limite.
 *
 * Esta é a proteção real ao profissional, e ela é estrutural em vez de informacional: limita o
 * estrago de quem falta em série (não dá para travar cinco horários pela plataforma toda) sem
 * nunca dizer a um profissional que aquele paciente é "ruim". Deliberadamente **não** existe
 * bloqueio total: barrar acesso a atendimento de saúde por histórico de faltas é o tipo de
 * regra que não se defende depois — nem para o paciente, nem no CDC, nem para o CFN.
 */
export function maxOpenAppointmentsFor(level: PatientReliabilityLevel): number | null {
  return level === 'REGULAR' ? null : 1
}

/** Aviso mostrado ao próprio paciente. Nunca ao profissional. */
export function patientReliabilityNotice(r: PatientReliability): string | null {
  if (r.level === 'REGULAR') return null
  const faltas = r.noShow === 1 ? '1 falta' : `${r.noShow} faltas`
  return (
    `Registramos ${faltas} sem aviso no seu histórico recente. Por isso, você pode manter ` +
    'apenas uma consulta agendada por vez até voltar a comparecer. Se alguma falta foi marcada ' +
    'por engano, você pode contestar na própria consulta em Minhas Consultas.'
  )
}

// ── Consultas ao banco ────────────────────────────────────────────────────────────────────

/**
 * Confiabilidade do paciente, sobre as últimas PATIENT_HISTORY_WINDOW consultas passadas.
 *
 * Busca as linhas e conta em memória em vez de somar no SQL porque a regra do PENDING vencido
 * (`effectiveAttendance`) é derivada na leitura — reproduzi-la como cláusula SQL duplicaria a
 * definição em dois lugares e as duas cópias iam divergir no primeiro ajuste de prazo.
 */
export async function getPatientReliability(
  patientId: string,
  now: Date = new Date()
): Promise<PatientReliability> {
  const recent = await prisma.appointment.findMany({
    where: { patientId, status: 'CONFIRMED', scheduledAt: { lte: now } },
    select: { attendance: true, scheduledAt: true, status: true },
    orderBy: { scheduledAt: 'desc' },
    take: PATIENT_HISTORY_WINDOW,
  })

  let attended = 0
  let noShow = 0
  for (const a of recent) {
    const resolved = effectiveAttendance(a, now)
    if (resolved === 'ATTENDED') attended++
    else if (resolved === 'NO_SHOW') noShow++
    // PENDING (ainda dentro do prazo) e CONTESTED não contam para nenhum dos lados.
  }
  return patientReliability({ attended, noShow })
}

/** Agendamentos futuros que o paciente ainda mantém — o que o limite de abertos compara. */
export async function countOpenAppointments(patientId: string, now: Date = new Date()): Promise<number> {
  return prisma.appointment.count({
    where: {
      patientId,
      status: { in: ['AWAITING_CONFIRMATION', 'CONFIRMED'] },
      scheduledAt: { gt: now },
    },
  })
}

export interface ProfessionalReliabilityCounts {
  fulfilled: number
  lateCancellations: number
}

/**
 * Contadores de confiabilidade do profissional, sobre todo o histórico.
 *
 * Janela vitalícia e não móvel: numa plataforma nova, um recorte de 60 dias deixaria quase
 * todo mundo sem amostra suficiente para ter nível nenhum. Quando o volume crescer, trocar por
 * uma janela móvel é a evolução natural — e é aqui que ela entra, sem tocar em mais nada.
 */
export async function getProfessionalReliabilityCounts(
  professionalId: string,
  now: Date = new Date()
): Promise<ProfessionalReliabilityCounts> {
  const [past, lateCancellations] = await Promise.all([
    prisma.appointment.findMany({
      where: { professionalId, status: 'CONFIRMED', scheduledAt: { lte: now } },
      select: { attendance: true, scheduledAt: true, status: true },
    }),
    // Cancelou uma consulta que já estava marcada — o paciente já contava com o horário.
    prisma.appointment.count({
      where: { professionalId, status: 'CANCELLED', cancelledBy: 'PROFESSIONAL', confirmedAt: { not: null } },
    }),
  ])

  // Consulta realizada = aconteceu de verdade. Falta do paciente não conta como consulta
  // realizada (não houve atendimento), mas também não é falha do profissional: fica fora dos
  // dois lados da conta.
  const fulfilled = past.filter((a) => effectiveAttendance(a, now) === 'ATTENDED').length
  return { fulfilled, lateCancellations }
}
