import { prisma } from './prisma'
import { splitFee } from './fees'
import { reaisToCents } from './money'
import { buildPixPayload, txidForAppointment, txidForEnrollment } from './pix'
import { generateMeetingRoom } from './meeting'

// Pagamento por Pix com chave estática.
//
// O desenho: o paciente paga **na chave da plataforma**, não na do profissional. O dinheiro
// entra inteiro numa conta só, e o repasse (total − taxa) sai depois, como transferência
// registrada na tabela Payout. A divisão não acontece sozinha em lugar nenhum: alguém a faz.
//
// O custo dessa escolha é honesto e está todo aqui: **não existe webhook**. Chave Pix estática
// não avisa ninguém quando o dinheiro cai, então alguém precisa olhar o extrato. O BR Code
// carrega valor e txid justamente para que esse alguém consiga achar a linha certa sem
// adivinhar. Trocar isto por um PSP (Mercado Pago, Efí, Asaas) é o caminho quando o volume não
// couber mais na conferência manual — e é este arquivo que muda, não o resto do app.

/** Dados da chave da plataforma, do ambiente. Sem chave configurada, não há cobrança nenhuma. */
export interface PlatformPix {
  key: string
  name: string
  city: string
}

export function platformPix(): PlatformPix | null {
  const key = process.env.PLATFORM_PIX_KEY?.trim()
  if (!key) return null
  return {
    key,
    name: process.env.PLATFORM_PIX_NAME?.trim() || 'NutriMatch',
    city: process.env.PLATFORM_PIX_CITY?.trim() || 'Sao Paulo',
  }
}

export interface PixCharge {
  /** O "copia e cola" que o paciente cola no app do banco. */
  payload: string
  txid: string
  amountCents: number
  feeCents: number
  netCents: number
  platform: PlatformPix
}

function buildCharge(txid: string, amountCents: number, platform: PlatformPix): PixCharge {
  const { feeCents, netCents } = splitFee(amountCents)
  return {
    payload: buildPixPayload({
      key: platform.key,
      merchantName: platform.name,
      merchantCity: platform.city,
      amountCents,
      txid,
    }),
    txid,
    amountCents,
    feeCents,
    netCents,
    platform,
  }
}

/**
 * Prepara a cobrança de uma consulta: grava o txid e devolve o código para exibir. Não move
 * dinheiro nem promete nada — só cria o identificador pelo qual o pagamento será reconhecido.
 */
export async function createAppointmentPixCharge(appointmentId: string, priceReais: number): Promise<PixCharge | null> {
  const platform = platformPix()
  if (!platform) return null

  const txid = txidForAppointment(appointmentId)
  const amountCents = reaisToCents(priceReais)
  const { feeCents } = splitFee(amountCents)

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { pixTxid: txid, amountCents, feeCents },
  })

  return buildCharge(txid, amountCents, platform)
}

/** Recria o código de uma cobrança já existente, para reexibir a tela de pagamento. */
export function appointmentPixCharge(appointment: {
  pixTxid: string | null
  amountCents: number | null
  price: number
}): PixCharge | null {
  const platform = platformPix()
  if (!platform || !appointment.pixTxid) return null
  return buildCharge(appointment.pixTxid, appointment.amountCents ?? reaisToCents(appointment.price), platform)
}

export async function createEnrollmentPixCharge(enrollmentId: string, totalReais: number): Promise<PixCharge | null> {
  const platform = platformPix()
  if (!platform) return null

  const txid = txidForEnrollment(enrollmentId)
  const amountCents = reaisToCents(totalReais)
  const { feeCents } = splitFee(amountCents)

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { pixTxid: txid, paidAmountCents: amountCents, feeCents },
  })

  return buildCharge(txid, amountCents, platform)
}

export function enrollmentPixCharge(enrollment: {
  pixTxid: string | null
  paidAmountCents: number | null
}): PixCharge | null {
  const platform = platformPix()
  if (!platform || !enrollment.pixTxid || enrollment.paidAmountCents == null) return null
  return buildCharge(enrollment.pixTxid, enrollment.paidAmountCents, platform)
}

/**
 * Confirma que o dinheiro caiu, depois de alguém conferir o extrato. Três fatos nascem aqui, na
 * mesma transação, porque nenhum deles faz sentido sozinho:
 *
 *  1. **O pagamento está confirmado.** O paciente pagou no link e o extrato foi conferido.
 *  2. **A consulta está marcada.** Não há mais um passo em que o profissional aceita: dinheiro
 *     conferido é consulta marcada, e ela aparece nos três painéis no mesmo instante. O
 *     profissional continua podendo cancelar (o que pesa na confiabilidade dele, ver
 *     lib/reputation.ts) — o que ele não faz mais é deixar o paciente esperando um "sim".
 *  3. **O repasse existe como dívida.** Confirmar o recebimento sem registrar o que se passou a
 *     dever ao profissional é como um repasse desaparece.
 *
 * Se o profissional não tem chave Pix, nada disso muda: o repasse nasce PENDING e fica retido
 * até a chave existir. A consulta acontece de todo jeito — travá-la por um dado que só é
 * necessário na hora de transferir puniria o paciente por uma pendência que não é dele.
 */
export async function confirmAppointmentPixPayment(appointmentId: string, reviewerUserId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { professional: { select: { id: true, pixKey: true } } },
  })
  if (!appointment) return null
  if (appointment.paymentStatus === 'PAID') return { alreadyPaid: true as const }

  const grossCents = appointment.amountCents ?? reaisToCents(appointment.price)
  const { feeCents, netCents } = splitFee(grossCents)
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        paymentStatus: 'PAID',
        paidAt: now,
        paymentDeadline: null,
        pixReviewedBy: reviewerUserId,
        pixReviewedAt: now,
        amountCents: grossCents,
        feeCents,
        // A consulta passa a valer aqui.
        status: 'CONFIRMED',
        confirmedAt: now,
        slotHeldAt: appointment.scheduledAt,
        // Não há mais prazo para ninguém responder, então deixar o campo preenchido só faria
        // isExpiredAwaiting mentir sobre uma consulta que já está confirmada.
        confirmationDeadline: null,
        // A sala de vídeo nasce com a confirmação, não com o pedido: um pedido que podia não
        // virar consulta não merecia sala, e o nome da sala é o controle de acesso dela.
        ...(appointment.modality === 'ONLINE' && !appointment.meetingRoom
          ? { meetingRoom: generateMeetingRoom() }
          : {}),
      },
    })
    // upsert e não create: reconfirmar por engano não pode gerar dois repasses da mesma consulta.
    await tx.payout.upsert({
      where: { appointmentId },
      create: {
        appointmentId,
        professionalId: appointment.professional.id,
        grossCents,
        feeCents,
        netCents,
        pixKeySnapshot: appointment.professional.pixKey,
      },
      update: {},
    })
  })

  return {
    alreadyPaid: false as const,
    netCents,
    grossCents,
    feeCents,
    scheduledAt: appointment.scheduledAt,
    // Quem chama precisa saber disto para avisar o admin de que o dinheiro entrou mas não tem
    // para onde sair.
    professionalHasPixKey: Boolean(appointment.professional.pixKey?.trim()),
  }
}

export async function confirmEnrollmentPixPayment(enrollmentId: string, reviewerUserId: string) {
  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } })
  if (!enrollment) return null
  if (enrollment.status === 'ACTIVE' && enrollment.paidAt) return { alreadyPaid: true as const }

  const now = new Date()
  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      status: 'ACTIVE',
      paidAt: now,
      // O prazo do programa começa quando ele é pago, não quando a compra foi aberta.
      startedAt: now,
      pixReviewedBy: reviewerUserId,
      pixReviewedAt: now,
    },
  })
  return { alreadyPaid: false as const }
}

/**
 * Registra o valor e a taxa de uma cobrança que será paga pelo link do InfinitePay.
 *
 * Mesmo papel de createAppointmentPixCharge, sem o código Pix: o paciente paga num link
 * externo, e o que esta plataforma precisa guardar é quanto era devido e qual fatia é da casa —
 * é disso que o repasse é calculado depois, em confirmAppointmentPixPayment, que não se importa
 * com o caminho pelo qual o dinheiro chegou.
 *
 * O nome do arquivo virou dívida: ele trata de "a plataforma recebe e repassa", e o Pix é hoje
 * só a perna do repasse. Renomear agora espalharia o diff por meia dúzia de telas sem mudar
 * comportamento nenhum.
 */
export async function recordAppointmentCharge(appointmentId: string, priceReais: number): Promise<number> {
  const amountCents = reaisToCents(priceReais)
  const { feeCents } = splitFee(amountCents)
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { amountCents, feeCents },
  })
  return amountCents
}

export async function recordEnrollmentCharge(enrollmentId: string, totalReais: number): Promise<number> {
  const amountCents = reaisToCents(totalReais)
  const { feeCents } = splitFee(amountCents)
  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { paidAmountCents: amountCents, feeCents },
  })
  return amountCents
}
