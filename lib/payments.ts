import { prisma } from './prisma'
import { professionalPaymentLink } from './payment-link'

// Pagamento de consulta e de pacote.
//
// O Stripe saiu do projeto: nunca foi usado (zero linhas no banco tinham `paymentIntentId`,
// conta Connect ou assinatura) e mantê-lo significava carregar um segundo caminho de dinheiro
// que ninguém exercitava — o pior tipo de código, o que parece funcionar porque nunca roda.
//
// O caminho real é um só: o paciente paga num **link do InfinitePay** do profissional, avisa que
// pagou, e um admin confere o extrato e confirma. O dinheiro entra na conta da plataforma e sai
// pela chave Pix do profissional, menos a taxa. Ver lib/payment-link.ts e lib/pix-payments.ts.
//
// **Consequência que não pode ficar implícita: não existe estorno automático.** Quando um
// cancelamento gera devolução, alguém precisa mandar o dinheiro de volta à mão. As funções que
// chamavam `stripe.refunds.create` foram removidas em vez de viradas em stubs silenciosos —
// um stub que devolve "estornado: R$ 150" sem mover dinheiro é pior que nada. A rota de
// cancelamento hoje registra o cancelamento e informa zero de estorno; a fila de devoluções
// pendentes ainda precisa ser construída.

/**
 * Quanto tempo o horário fica preso enquanto o pagamento não é confirmado.
 *
 * 30 minutos, com contador visível na tela de pagamento. É curto de propósito: um horário preso
 * é um horário que mais ninguém pode marcar, e um pedido abandonado não pode bloquear a agenda
 * de alguém por um dia.
 *
 * O relógio só corre enquanto a cobrança está `PENDING`. Assim que o paciente avisa que pagou
 * (`AWAITING_REVIEW`), quem passa a valer é o prazo de confirmação — senão um pagamento feito
 * às 23h expiraria antes de o admin ter chance de conferir o extrato. Por isso a tela precisa
 * deixar claro que **avisar é o que segura o horário**, não só pagar.
 */
export const PAYMENT_HOLD_MINUTES = 30

export function paymentHoldDeadline(now: Date = new Date()): Date {
  return new Date(now.getTime() + PAYMENT_HOLD_MINUTES * 60_000)
}

export interface PaymentRequirement {
  required: boolean
  reason:
    | 'PROFESSIONAL_WITHOUT_LINK'
    | 'PROFESSIONAL_WITHOUT_PIX'
    | 'COVERED_BY_PACKAGE'
    | 'REQUIRED'
}

/**
 * Decide se esta consulta passa pelo caixa da plataforma.
 *
 * Exige as duas pontas do caminho do dinheiro, e a distinção importa: sem o link de pagamento
 * não há como cobrar o paciente, e sem a chave Pix não há como devolver os 90% ao profissional.
 * Faltando a segunda, cobrar seria reter dinheiro de alguém sem ter para onde mandar — pior do
 * que não cobrar.
 *
 * Nos dois casos o app segue funcionando como antes de existir pagamento: a consulta acontece e
 * o valor é combinado direto entre paciente e profissional. Mesma degradação graciosa de sempre.
 */
export function paymentRequirementFor(
  professional:
    | { price: number; paymentLinkUrl?: string | null; paymentLinkAmount?: number | null; pixKey?: string | null }
    | null
    | undefined,
  coveredByEnrollment: boolean
): PaymentRequirement {
  if (coveredByEnrollment) return { required: false, reason: 'COVERED_BY_PACKAGE' }
  if (!professional) return { required: false, reason: 'PROFESSIONAL_WITHOUT_LINK' }
  if (!professionalPaymentLink(professional)) {
    return { required: false, reason: 'PROFESSIONAL_WITHOUT_LINK' }
  }
  if (!professional.pixKey?.trim()) {
    return { required: false, reason: 'PROFESSIONAL_WITHOUT_PIX' }
  }
  return { required: true, reason: 'REQUIRED' }
}

// ── Direito de arrependimento ────────────────────────────────────────────────────────────

export const WITHDRAWAL_WINDOW_DAYS = 7

/**
 * Janela do art. 49 do CDC: até 7 dias corridos da compra de um pacote, o paciente pode desistir
 * e receber 100% de volta, sem justificativa.
 *
 * Continua sendo calculada e continua decidindo o que a rota de cancelamento diz ao paciente.
 * O que mudou com a saída do Stripe é que **a devolução em si passou a ser manual** — antes um
 * `refunds.create` fechava o ciclo sozinho. Estar dentro da janela hoje significa "a plataforma
 * deve este dinheiro", não "o dinheiro já voltou".
 */
export function isWithinWithdrawalWindow(paidAt: Date | null, now: Date = new Date()): boolean {
  if (!paidAt) return false
  return now.getTime() - paidAt.getTime() <= WITHDRAWAL_WINDOW_DAYS * 24 * 3600_000
}

/**
 * Acerto de um pacote vencido: calcula quanto sobrou sem uso e registra a dívida.
 *
 * Era `refundUnusedEnrollment`, e terminava num `stripe.refunds.create`. O cálculo é o mesmo —
 * proporcional às consultas não usadas, arredondado para baixo para nunca passar do que foi
 * pago. O que mudou é o fim: em vez de devolver o dinheiro, grava `refundedCents` e
 * `refundedAt`, e a transferência é feita à mão pelo caminho por onde o dinheiro entrou.
 *
 * `refundedAt` continua sendo a marca de idempotência, então rodar o acerto duas vezes não
 * duplica dívida. Deixou de exigir `paymentIntentId`: era a marca de um pagamento pelo Stripe, e
 * exigi-la faria todo pacote pago por link nunca ser acertado.
 */
export async function settleUnusedEnrollment(
  enrollmentId: string
): Promise<{ refundedCents: number; unused: number } | null> {
  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } })
  if (!enrollment?.paidAmountCents) return null
  if (enrollment.refundedAt) return null // já acertado

  const used = await prisma.appointment.count({
    where: { enrollmentId, status: { in: ['CONFIRMED', 'AWAITING_CONFIRMATION'] } },
  })
  const unused = Math.max(0, enrollment.consultations - used)
  // Arredonda para baixo: a dívida nunca pode passar do que foi efetivamente pago.
  const refundCents =
    unused === 0 ? 0 : Math.floor((enrollment.paidAmountCents * unused) / enrollment.consultations)

  if (refundCents <= 0) {
    await prisma.enrollment.update({ where: { id: enrollmentId }, data: { refundedAt: new Date() } })
    return { refundedCents: 0, unused }
  }

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { refundedCents: refundCents, refundedAt: new Date(), status: 'CANCELLED' },
  })
  return { refundedCents: refundCents, unused }
}
