import { prisma } from './prisma'
import { professionalPaymentLink } from './payment-link'

// Pagamento de consulta e de pacote.
//
// Existe um caminho de dinheiro só, e não há gateway nenhum: o paciente paga num **link do
// InfinitePay** cadastrado pelo admin para aquele profissional, avisa que pagou, e um admin
// confere o extrato e confirma. O dinheiro entra na conta da plataforma e sai pela chave Pix do
// profissional, menos a taxa. Ver lib/payment-link.ts e lib/pix-payments.ts.
//
// **Consequência que não pode ficar implícita: não existe estorno automático.** Quando um
// cancelamento gera devolução, alguém precisa mandar o dinheiro de volta à mão. Não há stub
// que finja o contrário — devolver "estornado: R$ 150" sem mover dinheiro seria pior que nada.
// A rota de cancelamento registra o cancelamento e informa zero de estorno; a fila de
// devoluções pendentes ainda precisa ser construída.

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
  reason: 'PROFESSIONAL_WITHOUT_LINK' | 'COVERED_BY_PACKAGE' | 'REQUIRED'
}

/**
 * Decide se esta consulta passa pelo caixa da plataforma.
 *
 * A única condição é existir o **link de pagamento** que o admin cadastrou para o profissional.
 * É por ele que o paciente paga; sem ele não há como cobrar, e a consulta volta a ser combinada
 * direto entre as duas pessoas — a mesma degradação graciosa de sempre.
 *
 * Antes exigia também a chave Pix, e isso nunca fez sentido aqui. O repasse é manual — o
 * dinheiro entra na conta da plataforma e sai por transferência feita por um admin, dias
 * depois. Travar a cobrança por um dado que só é necessário no fim impedia a consulta de ser
 * paga por algo que dá tempo de resolver.
 *
 * A chave Pix continua obrigatória para **repassar**: a fila de repasses em /admin/financeiro
 * não deixa pagar quem não tem chave, e /admin/links-de-pagamento marca quem está pendente. O
 * dinheiro fica retido até a chave existir, o que é bem melhor que a consulta nunca ser cobrada.
 */
export function paymentRequirementFor(
  professional:
    | { price: number; paymentLinkUrl?: string | null; paymentLinkAmount?: number | null }
    | null
    | undefined,
  coveredByEnrollment: boolean
): PaymentRequirement {
  if (coveredByEnrollment) return { required: false, reason: 'COVERED_BY_PACKAGE' }
  if (!professional) return { required: false, reason: 'PROFESSIONAL_WITHOUT_LINK' }
  if (!professionalPaymentLink(professional)) {
    return { required: false, reason: 'PROFESSIONAL_WITHOUT_LINK' }
  }
  return { required: true, reason: 'REQUIRED' }
}

// ── Direito de arrependimento ────────────────────────────────────────────────────────────

export const WITHDRAWAL_WINDOW_DAYS = 7

/**
 * Janela do art. 49 do CDC: até 7 dias corridos da compra de um pacote, o paciente pode desistir
 * e receber 100% de volta, sem justificativa.
 *
 * É calculada e decide o que a rota de cancelamento diz ao paciente. **A devolução em si é
 * manual**, então estar dentro da janela significa "a plataforma deve este dinheiro", não "o
 * dinheiro já voltou".
 */
export function isWithinWithdrawalWindow(paidAt: Date | null, now: Date = new Date()): boolean {
  if (!paidAt) return false
  return now.getTime() - paidAt.getTime() <= WITHDRAWAL_WINDOW_DAYS * 24 * 3600_000
}

/**
 * Acerto de um pacote vencido: calcula quanto sobrou sem uso e registra a dívida.
 *
 * O cálculo é proporcional às consultas não usadas, arredondado para baixo para nunca passar
 * do que foi pago. Não devolve dinheiro: grava `refundedCents` e `refundedAt`, e a
 * transferência é feita à mão pelo caminho por onde o dinheiro entrou.
 *
 * `refundedAt` é a marca de idempotência, então rodar o acerto duas vezes não duplica dívida.
 * A condição olha `paidAmountCents`, que é o que o pagamento por link registra.
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
