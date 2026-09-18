import type Stripe from 'stripe'
import { prisma } from './prisma'
import { appUrl, getStripe, stripeEnabled } from './stripe'
import { professionalPaymentLink } from './payment-link'
import { canReceivePix, pixEnabled } from './pix-payments'
import { splitFee } from './fees'
import { reaisToCents } from './money'

// Pagamento de consulta e de pacote. Duas formas de pagamento: cartão e Pix.
//
// A regra que organiza tudo aqui: **a consulta avulsa é autorizada no agendamento e capturada
// só quando o profissional confirma** — mas só no cartão. Em Stripe isso é
// `capture_method: 'manual'` — o valor fica reservado no cartão do paciente e só vira cobrança
// na captura. Se o profissional recusar ou deixar o prazo vencer, a autorização é cancelada:
// nada foi cobrado, não existe estorno, não existe dinheiro preso. A alternativa (cobrar e
// estornar) deixaria o paciente dias sem o dinheiro por uma decisão que não foi dele.
//
// Pix não aceita captura manual — a Stripe cobra no instante em que o paciente confirma no app
// do banco, sem meio-termo. Por isso uma consulta paga por Pix pula direto para PAID, antes de
// qualquer decisão do profissional, e se ele nunca confirmar o dinheiro volta por estorno
// (refundUnconfirmedAppointmentPayment) em vez de por cancelamento de autorização
// (voidAppointmentPayment) — mesmo resultado para o paciente, caminho diferente no Stripe.
//
// O pacote é o oposto: captura imediata em qualquer forma de pagamento, porque não há ninguém
// para confirmar a compra de um programa. O que ele tem no lugar é a devolução proporcional do
// que não foi usado.

/**
 * Quanto tempo o horário fica preso enquanto o checkout está aberto. Curto de propósito: um
 * carrinho abandonado não pode bloquear a agenda por 24h. É tempo suficiente para digitar um
 * cartão, e o Stripe expira a própria sessão em 24h de qualquer forma.
 */
export const PAYMENT_HOLD_MINUTES = 20

/** Janela de autorização do Stripe. A confirmação de 24h cabe com folga dentro dela. */
export const AUTHORIZATION_VALID_DAYS = 7

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
 * Exige as duas pontas do caminho do dinheiro, e a distincao importa: sem o link de pagamento
 * nao ha como cobrar o paciente, e sem a chave Pix nao ha como devolver os 90% ao profissional.
 * Faltando a segunda, cobrar seria reter dinheiro de alguem sem ter para onde mandar — pior do
 * que nao cobrar.
 *
 * Nos dois casos o app segue funcionando como antes de existir pagamento: a consulta acontece e
 * o valor e combinado direto entre paciente e profissional. Mesma degradacao graciosa de sempre.
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

/**
 * Checkout de uma consulta avulsa: autoriza agora, captura na confirmação — só no cartão.
 *
 * Pix não tem "segurar e capturar depois" (a Stripe não oferece captura manual para Pix: o
 * pagamento é debitado no instante em que o paciente confirma no app do banco). Por isso
 * `capture_method: manual` é escopado só ao cartão via `payment_method_options`, em vez do
 * `payment_intent_data.capture_method` global usado antes — global entraria em conflito com o
 * Pix listado ao lado. Uma consulta paga por Pix chega em PAID (não AUTHORIZED) assim que o
 * webhook processa o checkout; ver refundUnconfirmedAppointmentPayment para o que acontece se
 * o profissional nunca confirmar essa consulta.
 *
 * Cobrança do tipo destination charge — o dinheiro entra na plataforma e é repassado para a
 * conta conectada do profissional já descontada a taxa. O paciente vê um valor só: o total.
 */
export async function createAppointmentCheckout(args: {
  appointmentId: string
  priceReais: number
  professionalStripeAccountId: string
  professionalName: string
  patientEmail: string
  dateLabel: string
  timeLabel: string
}): Promise<{ url: string; sessionId: string; amountCents: number; feeCents: number }> {
  const stripe = getStripe()
  const amountCents = reaisToCents(args.priceReais)
  const { feeCents } = splitFee(amountCents)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: args.patientEmail,
    payment_method_types: ['card', 'pix'],
    payment_method_options: {
      // O ponto central deste arquivo: o cartão autoriza, não cobra. Pix não aceita esta opção
      // — por isso fica de fora deste objeto, e captura no momento do pagamento.
      card: { capture_method: 'manual' },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'brl',
          unit_amount: amountCents,
          product_data: {
            name: `Consulta com ${args.professionalName}`,
            description: `${args.dateLabel} às ${args.timeLabel}`,
          },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: feeCents,
      transfer_data: { destination: args.professionalStripeAccountId },
      metadata: { appointmentId: args.appointmentId, kind: 'APPOINTMENT' },
      description: `Consulta ${args.dateLabel} ${args.timeLabel} — ${args.professionalName}`,
    },
    metadata: { appointmentId: args.appointmentId, kind: 'APPOINTMENT' },
    // A sessão do Stripe expira junto com a nossa reserva do horário, para não existir o caso
    // de pagar um checkout cujo horário já foi liberado para outra pessoa.
    expires_at: Math.floor(paymentHoldDeadline().getTime() / 1000) + 60 * 10,
    success_url: `${appUrl()}/patient/consultas?pagamento=autorizado`,
    cancel_url: `${appUrl()}/patient/consultas?pagamento=cancelado`,
  })

  if (!session.url) throw new Error('Stripe não retornou a URL do checkout')
  return { url: session.url, sessionId: session.id, amountCents, feeCents }
}

/** Checkout de um pacote: cobrança única, capturada na hora. */
export async function createEnrollmentCheckout(args: {
  enrollmentId: string
  totalReais: number
  consultations: number
  durationMonths: number
  planName: string
  professionalStripeAccountId: string
  professionalName: string
  patientEmail: string
}): Promise<{ url: string; sessionId: string; amountCents: number; feeCents: number }> {
  const stripe = getStripe()
  const amountCents = reaisToCents(args.totalReais)
  const { feeCents } = splitFee(amountCents)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: args.patientEmail,
    // Sem restrição de captura aqui — o pacote já é cobrado na hora em qualquer forma de
    // pagamento, então Pix e cartão convivem sem o ajuste que a consulta avulsa precisa.
    payment_method_types: ['card', 'pix'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'brl',
          unit_amount: amountCents,
          product_data: {
            name: `${args.planName} — ${args.professionalName}`,
            description: `${args.consultations} consultas em ${args.durationMonths} meses`,
          },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: feeCents,
      transfer_data: { destination: args.professionalStripeAccountId },
      metadata: { enrollmentId: args.enrollmentId, kind: 'ENROLLMENT' },
      description: `${args.planName} — ${args.professionalName}`,
    },
    metadata: { enrollmentId: args.enrollmentId, kind: 'ENROLLMENT' },
    success_url: `${appUrl()}/patient/consultas?pacote=pago`,
    cancel_url: `${appUrl()}/programas?pacote=cancelado`,
  })

  if (!session.url) throw new Error('Stripe não retornou a URL do checkout')
  return { url: session.url, sessionId: session.id, amountCents, feeCents }
}

/**
 * Captura a autorização de uma consulta — o momento em que o dinheiro efetivamente sai do
 * cartão do paciente. Chamado quando o profissional confirma, e só então.
 */
export async function captureAppointmentPayment(appointmentId: string): Promise<boolean> {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } })
  if (!appointment?.paymentIntentId) return false
  if (appointment.paymentStatus !== 'AUTHORIZED') return false

  const stripe = getStripe()
  try {
    const intent = await stripe.paymentIntents.capture(appointment.paymentIntentId)
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        paymentStatus: intent.status === 'succeeded' ? 'PAID' : 'AUTHORIZED',
        paidAt: intent.status === 'succeeded' ? new Date() : null,
      },
    })
    return intent.status === 'succeeded'
  } catch (e) {
    console.error('[payments] falha ao capturar', appointmentId, e)
    throw e
  }
}

/**
 * Cancela a autorização sem cobrar nada. É o caminho quando o profissional recusa, quando o
 * paciente cancela antes da confirmação, ou quando o prazo de confirmação vence.
 *
 * Escrito para ser idempotente e para nunca impedir o cancelamento em si: se o Stripe recusar
 * o cancelamento (por exemplo, porque a autorização já expirou sozinha), a consulta ainda
 * precisa ser cancelada no nosso lado. Um erro aqui é registrado, não propagado.
 */
export async function voidAppointmentPayment(appointmentId: string): Promise<void> {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } })
  if (!appointment?.paymentIntentId) return
  if (appointment.paymentStatus !== 'AUTHORIZED' && appointment.paymentStatus !== 'PENDING') return

  try {
    await getStripe().paymentIntents.cancel(appointment.paymentIntentId)
  } catch (e) {
    // Autorização já expirada ou já cancelada: o resultado desejado (nada cobrado) vale de
    // qualquer forma, então registramos e seguimos.
    console.error('[payments] cancelamento da autorização falhou (seguindo mesmo assim)', appointmentId, e)
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { paymentStatus: 'VOIDED' },
  })
}

/**
 * Devolve o valor de uma consulta que já foi cobrada (Pix) mas nunca chegou a ser confirmada
 * pelo profissional. O cartão nunca chega a PAID antes da confirmação — a captura só acontece
 * junto dela, em captureAppointmentPayment — então este caminho hoje só existe para Pix, que
 * captura no instante do pagamento, antes de qualquer decisão do profissional.
 *
 * Diferente de uma consulta PAID que já foi confirmada (deliberadamente não devolvida
 * automaticamente ao cancelar — ver o comentário na rota de cancelamento), aqui não há política
 * de janela de cancelamento para inventar: o profissional nunca aceitou a consulta, então o
 * paciente tem direito ao valor cheio de volta, sem ambiguidade.
 */
export async function refundUnconfirmedAppointmentPayment(appointmentId: string): Promise<void> {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } })
  if (!appointment?.paymentIntentId) return
  if (appointment.paymentStatus !== 'PAID') return

  try {
    await getStripe().refunds.create({
      payment_intent: appointment.paymentIntentId,
      refund_application_fee: true,
      reverse_transfer: true,
      metadata: { appointmentId, reason: 'never_confirmed' },
    })
  } catch (e) {
    // Mesma filosofia de voidAppointmentPayment: um erro aqui é registrado, não propagado — a
    // consulta ainda precisa ser cancelada no nosso lado mesmo se a devolução falhar agora.
    console.error('[payments] falha ao devolver consulta paga não confirmada (seguindo mesmo assim)', appointmentId, e)
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { paymentStatus: 'REFUNDED' },
  })
}

/**
 * Devolução integral de uma consulta JÁ CONFIRMADA — e portanto já cobrada, no cartão pela
 * captura na confirmação, no Pix desde o pagamento. Só faz sentido chamar isto quando a
 * devolução já foi decidida pelo chamador; a função em si não julga prazo nem quem está
 * cancelando — isso é da rota de cancelamento, que aplica regras diferentes para paciente
 * (dentro de CANCEL_REFUND_CUTOFF_HOURS de lib/appointment-status.ts) e profissional (sempre,
 * já que o profissional desistir de algo que já confirmou não é uma decisão do paciente).
 */
export async function refundConfirmedAppointmentCancellation(
  appointmentId: string
): Promise<{ refundedCents: number } | null> {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } })
  if (!appointment?.paymentIntentId || !appointment.amountCents) return null
  if (appointment.paymentStatus !== 'PAID') return null

  await getStripe().refunds.create({
    payment_intent: appointment.paymentIntentId,
    refund_application_fee: true,
    reverse_transfer: true,
    metadata: { appointmentId, reason: 'confirmed_appointment_cancelled' },
  })

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { paymentStatus: 'REFUNDED' },
  })

  return { refundedCents: appointment.amountCents }
}

/**
 * Janela do direito de arrependimento do CDC (art. 49, parágrafo único): 7 dias corridos da
 * contratação, para compras feitas fora do estabelecimento comercial — o que inclui qualquer
 * compra online, então vale para todo pacote pago pela plataforma. Contado de `paidAt`
 * (quando o dinheiro efetivamente saiu), não de `startedAt` ou `createdAt`.
 */
export const WITHDRAWAL_WINDOW_DAYS = 7

export function isWithinWithdrawalWindow(paidAt: Date | null, now: Date = new Date()): boolean {
  if (!paidAt) return false
  return now.getTime() - paidAt.getTime() <= WITHDRAWAL_WINDOW_DAYS * 24 * 3600_000
}

/**
 * Devolução integral por direito de arrependimento: até 7 dias corridos da compra, o paciente
 * pode cancelar o pacote e receber 100% de volta — sem justificativa, e a leitura mais segura do
 * art. 49 é sem descontar consultas já usadas dentro da janela, já que a lei não abre essa
 * exceção para serviços do jeito que abre para produtos físicos. Confirmar com jurídico antes de
 * cobrar de pacientes de verdade caso queira adotar uma leitura diferente.
 *
 * Diferente de refundUnusedEnrollment (que devolve só a parte não usada, no fim natural do
 * prazo do programa), aqui a lei garante o valor cheio, e só se aplica dentro da janela — depois
 * dela esta função não faz nada, e cancelar volta a não devolver automaticamente (mesma lacuna
 * documentada na rota de cancelamento de consulta: janela de cancelamento pós-arrependimento
 * ainda é uma política em aberto).
 */
export async function refundEnrollmentWithdrawal(
  enrollmentId: string
): Promise<{ refundedCents: number } | null> {
  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } })
  if (!enrollment?.paymentIntentId || !enrollment.paidAmountCents) return null
  if (enrollment.refundedAt) return null // já acertado
  if (!isWithinWithdrawalWindow(enrollment.paidAt)) return null

  await getStripe().refunds.create({
    payment_intent: enrollment.paymentIntentId,
    // Sem `amount`: devolve o total pago, não proporcional — é isso que o direito de
    // arrependimento garante, ao contrário do estorno de fim de programa abaixo.
    refund_application_fee: true,
    reverse_transfer: true,
    metadata: { enrollmentId, reason: 'withdrawal_7_days' },
  })

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { refundedCents: enrollment.paidAmountCents, refundedAt: new Date() },
  })

  return { refundedCents: enrollment.paidAmountCents }
}

/**
 * Devolve a parte do pacote que não foi usada.
 *
 * A taxa da plataforma é estornada junto, na mesma proporção: a NutriMatch não fica com a
 * comissão de uma consulta que nunca aconteceu. `refund_application_fee` e `reverse_transfer`
 * fazem esse acerto tanto na plataforma quanto na conta do profissional.
 */
export async function refundUnusedEnrollment(
  enrollmentId: string
): Promise<{ refundedCents: number; unused: number } | null> {
  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } })
  if (!enrollment?.paymentIntentId || !enrollment.paidAmountCents) return null
  if (enrollment.refundedAt) return null // já acertado

  const used = await prisma.appointment.count({
    where: { enrollmentId, status: { in: ['CONFIRMED', 'AWAITING_CONFIRMATION'] } },
  })
  const unused = Math.max(0, enrollment.consultations - used)
  if (unused === 0) {
    await prisma.enrollment.update({ where: { id: enrollmentId }, data: { refundedAt: new Date() } })
    return { refundedCents: 0, unused: 0 }
  }

  // Arredonda para baixo: o estorno nunca pode passar do que foi efetivamente pago.
  const refundCents = Math.floor((enrollment.paidAmountCents * unused) / enrollment.consultations)
  if (refundCents <= 0) {
    await prisma.enrollment.update({ where: { id: enrollmentId }, data: { refundedAt: new Date() } })
    return { refundedCents: 0, unused }
  }

  const stripe = getStripe()
  await stripe.refunds.create({
    payment_intent: enrollment.paymentIntentId,
    amount: refundCents,
    refund_application_fee: true,
    reverse_transfer: true,
    metadata: { enrollmentId, unused: String(unused) },
  })

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { refundedCents: refundCents, refundedAt: new Date(), status: 'CANCELLED' },
  })

  return { refundedCents: refundCents, unused }
}

/** Resolve o PaymentIntent de uma sessão de checkout, seja ele string ou objeto expandido. */
export function paymentIntentIdOf(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent
  if (!pi) return null
  return typeof pi === 'string' ? pi : pi.id
}
