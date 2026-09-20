import { prisma } from './prisma'
import { settleUnusedEnrollment } from './payments'
import { sendEmail } from './email'
import { packageRefunded } from './email-templates'
import { formatCents } from './money'

// Acerto de contas dos pacotes vencidos.
//
// A regra escolhida foi devolver o valor das consultas não usadas. Não é a prática mais comum
// do mercado — academia e afins costumam deixar expirar — mas cobrar por consulta de saúde que
// não aconteceu é exatamente o tipo de cláusula que o CDC derruba, e o custo de descobrir isso
// numa ação é maior do que o de devolver.
//
// Roda por cron. É seguro rodar mais de uma vez: refundedAt marca o acerto já feito e
// settleUnusedEnrollment sai fora quando encontra a marca.

/** Carência depois do fim do prazo antes de acertar as contas. */
const SETTLEMENT_GRACE_HOURS = 24

export interface SettlementRun {
  considered: number
  refunded: number
  refundedCents: number
  nothingToRefund: number
  failed: number
}

export async function settleExpiredEnrollments(now: Date = new Date()): Promise<SettlementRun> {
  const result: SettlementRun = { considered: 0, refunded: 0, refundedCents: 0, nothingToRefund: 0, failed: 0 }
  const cutoff = new Date(now.getTime() - SETTLEMENT_GRACE_HOURS * 3600_000)

  const expired = await prisma.enrollment.findMany({
    where: {
      status: 'ACTIVE',
      endsAt: { lte: cutoff },
      refundedAt: null,
      // Só faz sentido para pacote pago pela plataforma. Programa combinado direto entre
      // paciente e profissional não tem dinheiro nosso para devolver. A marca é o valor pago,
      // que é o que o caminho do link registra.
      paidAmountCents: { not: null },
    },
    include: {
      carePlan: { select: { name: true } },
      patient: { include: { user: { select: { name: true, email: true } } } },
      professional: { include: { user: { select: { name: true } } } },
    },
  })
  result.considered = expired.length

  for (const enrollment of expired) {
    try {
      const outcome = await settleUnusedEnrollment(enrollment.id)
      if (!outcome) {
        result.nothingToRefund++
        continue
      }
      if (outcome.refundedCents === 0) {
        result.nothingToRefund++
        continue
      }
      result.refunded++
      result.refundedCents += outcome.refundedCents

      await sendEmail({
        to: enrollment.patient.user.email,
        ...packageRefunded({
          patientName: enrollment.patient.user.name,
          planName: enrollment.carePlan.name,
          professionalName: enrollment.professional.user.name,
          unused: outcome.unused,
          total: enrollment.consultations,
          amountLabel: formatCents(outcome.refundedCents),
        }),
      })
    } catch (e) {
      // Um estorno que falha não pode derrubar o acerto dos outros pacotes. Fica marcado como
      // falha e a próxima execução tenta de novo, porque refundedAt não foi gravado.
      result.failed++
      console.error('[settlement] falha ao estornar', enrollment.id, e)
    }
  }

  // Pacotes vencidos sem dinheiro da plataforma envolvido só mudam de estado, para não ficarem
  // aparecendo como acompanhamento ativo para sempre.
  await prisma.enrollment.updateMany({
    where: { status: 'ACTIVE', endsAt: { lte: cutoff }, paidAmountCents: null },
    data: { status: 'CANCELLED' },
  })

  return result
}
