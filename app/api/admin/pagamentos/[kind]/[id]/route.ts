import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'
import { confirmAppointmentPixPayment, confirmEnrollmentPixPayment } from '@/lib/pix-payments'
import { notifyBookingConfirmed, notifyPaymentConfirmed, notifyPaymentRejected } from '@/lib/notifications'
import { formatCents, reaisToCents } from '@/lib/money'

// Conferência humana do pagamento: o admin olha o extrato e diz se o dinheiro entrou.
//
// É aqui que a consulta passa a existir de verdade. Não há mais um passo em que o profissional
// aceita: dinheiro conferido é consulta marcada, nos três painéis, no mesmo instante. Avisar
// antes disso seria pedir que alguém segurasse um horário por uma declaração não verificada.
const actionSchema = z.union([
  z.object({ action: z.literal('CONFIRM') }).strict(),
  z.object({ action: z.literal('REJECT'), reason: z.string().trim().max(300).optional() }).strict(),
])

export async function PATCH(request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params
  if (kind !== 'consulta' && kind !== 'pacote') {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 404 })
  }

  let admin
  try {
    admin = await requireRole('ADMIN')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(admin.id, 'admin-pagamento')
  if (limited) return limited

  const parsed = actionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  const now = new Date()

  if (kind === 'consulta') {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { include: { user: { select: { name: true, email: true } } } },
        professional: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    })
    if (!appointment) return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })

    if (parsed.data.action === 'REJECT') {
      await prisma.appointment.update({
        where: { id },
        data: {
          paymentStatus: 'PENDING',
          pixClaimedAt: null,
          pixClaimNote: parsed.data.reason ?? null,
          pixReviewedBy: admin.id,
          pixReviewedAt: now,
        },
      })
      audit({ actorId: admin.id, actorRole: 'ADMIN', action: 'PIX_PAYMENT_REJECTED', subjectId: id })
      // Sem este e-mail o paciente fica esperando por algo que já foi decidido — e a tela dele
      // volta a pedir pagamento sem nenhuma explicação.
      notifyPaymentRejected({
        patientName: appointment.patient.user.name,
        patientEmail: appointment.patient.user.email,
        what: `consulta com ${appointment.professional.user.name}`,
        amountLabel: formatCents(appointment.amountCents ?? reaisToCents(appointment.price)),
        reason: parsed.data.reason ?? null,
      })
      return NextResponse.json({ ok: true, confirmed: false })
    }

    // Confirmar o pagamento **é** marcar a consulta: o estado, a sala de vídeo e a dívida com o
    // profissional saem todos daqui, numa transação só. Ver confirmAppointmentPixPayment.
    const result = await confirmAppointmentPixPayment(id, admin.id)
    if (!result) return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
    if (result.alreadyPaid) return NextResponse.json({ ok: true, confirmed: true, alreadyPaid: true })

    // Um e-mail só para o paciente, juntando as duas novidades — o dinheiro foi conferido e a
    // consulta está marcada. Antes eram dois, porque eram dois instantes diferentes; agora é um.
    notifyBookingConfirmed(
      {
        scheduledAt: appointment.scheduledAt,
        modality: appointment.modality,
        price: appointment.price,
        patientName: appointment.patient.user.name,
        patientEmail: appointment.patient.user.email,
        professionalName: appointment.professional.user.name,
        professionalEmail: appointment.professional.user.email,
        professionalUserId: appointment.professional.user.id,
      },
      { paymentConfirmed: true }
    )

    audit({
      actorId: admin.id,
      actorRole: 'ADMIN',
      action: 'PIX_PAYMENT_CONFIRMED',
      subjectId: id,
      metadata: { grossCents: result.grossCents, netCents: result.netCents },
    })
    // O repasse nasceu aqui. Sem chave Pix ele fica retido, e quem confirmou precisa saber —
    // senão o dinheiro fica parado sem ninguém notar que falta um dado do profissional.
    return NextResponse.json({
      ok: true,
      confirmed: true,
      payoutHeld: !result.professionalHasPixKey,
      payoutHeldReason: result.professionalHasPixKey
        ? null
        : `${appointment.professional.user.name} ainda não cadastrou a chave Pix. A consulta está marcada e o repasse fica retido até a chave existir.`,
    })
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id },
    include: {
      patient: { include: { user: { select: { name: true, email: true } } } },
      carePlan: { select: { name: true } },
    },
  })
  if (!enrollment) return NextResponse.json({ error: 'Acompanhamento não encontrado' }, { status: 404 })

  const pacoteLabel = `pacote ${enrollment.carePlan.name}`
  const pacoteValor = formatCents(
    enrollment.paidAmountCents ?? reaisToCents(enrollment.pricePerConsultation * enrollment.consultations)
  )

  if (parsed.data.action === 'REJECT') {
    await prisma.enrollment.update({
      where: { id },
      data: { pixClaimedAt: null, pixClaimNote: parsed.data.reason ?? null, pixReviewedBy: admin.id, pixReviewedAt: now },
    })
    audit({ actorId: admin.id, actorRole: 'ADMIN', action: 'PIX_PAYMENT_REJECTED', subjectId: id })
    notifyPaymentRejected({
      patientName: enrollment.patient.user.name,
      patientEmail: enrollment.patient.user.email,
      what: pacoteLabel,
      amountLabel: pacoteValor,
      reason: parsed.data.reason ?? null,
    })
    return NextResponse.json({ ok: true, confirmed: false })
  }

  const result = await confirmEnrollmentPixPayment(id, admin.id)
  if (!result) return NextResponse.json({ error: 'Acompanhamento não encontrado' }, { status: 404 })
  audit({ actorId: admin.id, actorRole: 'ADMIN', action: 'PIX_PAYMENT_CONFIRMED', subjectId: id })
  notifyPaymentConfirmed({
    patientName: enrollment.patient.user.name,
    patientEmail: enrollment.patient.user.email,
    what: pacoteLabel,
    amountLabel: pacoteValor,
  })
  return NextResponse.json({ ok: true, confirmed: true })
}
