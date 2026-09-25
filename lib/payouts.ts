import { prisma } from './prisma'
import type { PayoutStatus, Prisma } from '@prisma/client'

// O ciclo de vida do repasse: quanto a plataforma deve, o que já saiu, e o que está comprovado.
//
// Três estados e não dois, porque "mandei o Pix" e "está comprovado" são fatos diferentes com
// datas diferentes, e é a diferença entre eles que o profissional precisa ver. Sem o estado do
// meio, uma transferência feita numa sexta à noite fica indistinguível de uma que nunca saiu.
//
// A regra que não pode ser contornada: **PAID exige comprovante anexado**. Ver markPayoutPaid.

export type PayoutPhase = 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED'

export const PAYOUT_LABELS: Record<PayoutPhase, { label: string; hint: string; tone: string }> = {
  PENDING: {
    label: 'A repassar',
    hint: 'O paciente pagou e a transferência para você ainda não saiu.',
    tone: 'bg-amber-50 text-amber-700',
  },
  PROCESSING: {
    label: 'Em processamento',
    hint: 'A transferência foi feita e o comprovante ainda não foi anexado.',
    tone: 'bg-blue-50 text-blue-700',
  },
  PAID: {
    label: 'Repassado',
    hint: 'Transferência feita e comprovante anexado.',
    tone: 'bg-emerald-50 text-emerald-700',
  },
  CANCELLED: {
    label: 'Cancelado',
    hint: 'A consulta foi cancelada antes do repasse sair.',
    tone: 'bg-gray-100 text-gray-600',
  },
}

/** Ainda deve dinheiro ao profissional: devido, ou transferido sem comprovante. */
export const OPEN_PAYOUT_STATUSES = ['PENDING', 'PROCESSING'] as const satisfies readonly PayoutStatus[]

export interface PayoutTotals {
  /** Devido e não transferido. */
  pendingCents: number
  pendingCount: number
  /** Transferido, comprovante pendente. */
  processingCents: number
  processingCount: number
  /** Transferido e comprovado. */
  paidCents: number
  paidCount: number
}

/**
 * Quanto o profissional tem a receber, em cada etapa. Já é o valor líquido: `netCents` nasce
 * descontada a taxa da plataforma (ver lib/fees.ts), então nenhuma tela precisa refazer a conta
 * — e é exatamente por isso que ela não pode ser refeita em tela nenhuma.
 */
export async function payoutTotals(professionalId: string): Promise<PayoutTotals> {
  const grouped = await prisma.payout.groupBy({
    by: ['status'],
    where: { professionalId },
    _sum: { netCents: true },
    _count: true,
  })
  const of = (s: PayoutStatus) => grouped.find((g) => g.status === s)
  return {
    pendingCents: of('PENDING')?._sum.netCents ?? 0,
    pendingCount: of('PENDING')?._count ?? 0,
    processingCents: of('PROCESSING')?._sum.netCents ?? 0,
    processingCount: of('PROCESSING')?._count ?? 0,
    paidCents: of('PAID')?._sum.netCents ?? 0,
    paidCount: of('PAID')?._count ?? 0,
  }
}

const payoutListInclude = {
  appointment: {
    select: {
      id: true,
      scheduledAt: true,
      modality: true,
      patient: { select: { user: { select: { name: true } } } },
    },
  },
  receiptFile: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } },
} satisfies Prisma.PayoutInclude

export type PayoutRow = Prisma.PayoutGetPayload<{ include: typeof payoutListInclude }>

/**
 * Ordem de exibição: em aberto antes de concluído, e o mais recente antes dentro de cada grupo.
 *
 * Feita aqui e não com `orderBy: { status: 'asc' }` de propósito. A ordem de um enum no Postgres
 * é a de criação dos valores, não a que o schema.prisma mostra — um valor adicionado depois
 * ordena por último mesmo aparecendo no meio do arquivo. Deixar a tela depender disso é combinar
 * que a próxima pessoa a acrescentar um estado quebre a ordenação sem tocar em tela nenhuma.
 */
const PHASE_ORDER: Record<PayoutPhase, number> = { PROCESSING: 0, PENDING: 1, PAID: 2, CANCELLED: 3 }

function byPhaseThenRecency<T extends { status: PayoutStatus; createdAt: Date }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      PHASE_ORDER[a.status as PayoutPhase] - PHASE_ORDER[b.status as PayoutPhase] ||
      b.createdAt.getTime() - a.createdAt.getTime()
  )
}

/** Os repasses de um profissional, em aberto primeiro. */
export async function listPayoutsFor(professionalId: string, take = 100): Promise<PayoutRow[]> {
  const rows = await prisma.payout.findMany({
    where: { professionalId },
    include: payoutListInclude,
    orderBy: { createdAt: 'desc' },
    take,
  })
  return byPhaseThenRecency(rows)
}

export type AdminPayoutRow = Prisma.PayoutGetPayload<{
  include: typeof payoutListInclude & {
    professional: { include: { user: { select: { name: true; email: true } } } }
  }
}>

/** A fila do admin: todo repasse, de todo mundo, com o dono ao lado. */
export async function listAllPayouts(status?: PayoutStatus, take = 200): Promise<AdminPayoutRow[]> {
  const rows = await prisma.payout.findMany({
    where: status ? { status } : undefined,
    include: {
      ...payoutListInclude,
      professional: { include: { user: { select: { name: true, email: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take,
  })
  return byPhaseThenRecency(rows)
}

/**
 * O que impediu a transição, ou `null` quando ela aconteceu.
 *
 * Falha como ausência de objeto, e não como variante de uma união discriminada, porque o
 * tsconfig deste projeto roda com `strict: false` — e sem `strictNullChecks` o TypeScript não
 * estreita união por discriminante booleano, então `if (!r.ok)` não daria acesso a `r.error`.
 * Mesmo formato de `guardMutation` em lib/rate-limit.ts, que já resolve isso assim.
 */
export type PayoutFailure = { status: number; error: string }

/**
 * "Mandei a transferência." Não exige comprovante — exigir aqui impediria o admin de registrar
 * o que ele acabou de fazer no banco só porque o PDF ainda não baixou, e o profissional ficaria
 * vendo "a repassar" para um dinheiro que já saiu.
 *
 * Exige chave Pix: declarar transferência para quem não tem para onde receber é registrar uma
 * coisa que não pode ter acontecido.
 */
export async function markPayoutSent(
  payoutId: string,
  adminId: string,
  note?: string
): Promise<PayoutFailure | null> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { professional: { select: { pixKey: true } } },
  })
  if (!payout) return { status: 404, error: 'Repasse não encontrado' }
  if (payout.status === 'CANCELLED') return { status: 409, error: 'Este repasse foi cancelado' }
  // Já concluído: não é erro, é nada a fazer. Repetir o clique não pode virar mensagem de falha.
  if (payout.status === 'PAID') return null
  if (!payout.professional.pixKey?.trim()) {
    return {
      status: 409,
      error: 'Este profissional ainda não cadastrou a chave Pix. O repasse fica retido até ele cadastrar.',
    }
  }

  await prisma.payout.update({
    where: { id: payoutId },
    data: { status: 'PROCESSING', sentAt: new Date(), paidBy: adminId, note: note ?? payout.note },
  })
  return null
}

/**
 * Conclui o repasse. **Só com comprovante anexado** — é a regra que dá sentido ao estado
 * anterior: sem documento, "pago" é só a palavra de quem pagou, e o profissional não tem como
 * conferir nada.
 *
 * O arquivo já foi gravado por quem chamou; aqui ele só é amarrado ao repasse, na mesma
 * transação que muda o estado, para não existir PAID sem comprovante nem comprovante órfão.
 */
export async function markPayoutPaid(
  payoutId: string,
  adminId: string,
  receiptFileId: string,
  note?: string
): Promise<PayoutFailure | null> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    select: { status: true, note: true, receiptFileId: true },
  })
  if (!payout) return { status: 404, error: 'Repasse não encontrado' }
  if (payout.status === 'CANCELLED') return { status: 409, error: 'Este repasse foi cancelado' }

  const anterior = payout.receiptFileId
  await prisma.$transaction(async (tx) => {
    await tx.payout.update({
      where: { id: payoutId },
      data: {
        status: 'PAID',
        receiptFileId,
        paidAt: new Date(),
        paidBy: adminId,
        // sentAt fica como estava: a data em que a transferência saiu continua sendo um fato,
        // mesmo depois de comprovada. Concluir sem ter passado por PROCESSING deixa o campo nulo,
        // que é a leitura certa — ninguém declarou o envio separadamente.
        note: note ?? payout.note,
      },
    })
    // Trocar o comprovante não pode deixar o antigo ocupando espaço para sempre.
    if (anterior && anterior !== receiptFileId) {
      await tx.storedFile.delete({ where: { id: anterior } }).catch(() => undefined)
    }
  })
  return null
}
