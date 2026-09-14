import { prisma } from './prisma'
import { splitFee } from './fees'
import { reaisToCents } from './money'
import { buildPixPayload, txidForAppointment, txidForEnrollment } from './pix'

// Pagamento por Pix com chave estática.
//
// O desenho: o paciente paga **na chave da plataforma**, não na do profissional. O dinheiro
// entra inteiro numa conta só, e o repasse (total − taxa) sai depois, como transferência
// registrada na tabela Payout. É o oposto do destination charge do Stripe, onde a divisão
// acontecia sozinha dentro da transação.
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

export const pixEnabled = () => platformPix() !== null

/** O profissional só entra no fluxo pago se tiver para onde receber o repasse. */
export function canReceivePix(professional: { pixKey?: string | null } | null | undefined): boolean {
  return Boolean(professional?.pixKey?.trim())
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
 * Confirma que o dinheiro caiu, depois de alguém conferir o extrato, e abre o repasse devido ao
 * profissional na mesma transação — os dois fatos nascem juntos e não podem existir separados:
 * confirmar o recebimento sem registrar a dívida com o profissional é como um repasse some.
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

  return { alreadyPaid: false as const, netCents, grossCents, feeCents }
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

/** Quanto o profissional tem a receber e quanto já recebeu. */
export async function payoutSummary(professionalId: string) {
  const [pending, paid] = await Promise.all([
    prisma.payout.aggregate({ where: { professionalId, status: 'PENDING' }, _sum: { netCents: true }, _count: true }),
    prisma.payout.aggregate({ where: { professionalId, status: 'PAID' }, _sum: { netCents: true }, _count: true }),
  ])
  return {
    pendingCents: pending._sum.netCents ?? 0,
    pendingCount: pending._count,
    paidCents: paid._sum.netCents ?? 0,
    paidCount: paid._count,
  }
}
