import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, ensurePatientProfile, requireUser } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { isSlotAvailable } from '@/lib/availability'
import { notifyBookingPendingPayment, notifyBookingRequested } from '@/lib/notifications'
import { lockAndResolveEnrollment } from '@/lib/enrollments'
import { confirmationDeadlineFor, staleHoldWhere } from '@/lib/appointment-status'
import { paymentHoldDeadline, paymentRequirementFor } from '@/lib/payments'
import { recordAppointmentCharge } from '@/lib/pix-payments'
import { formatDateBR, formatTimeBR } from '@/lib/format'
import { getEntitlements } from '@/lib/subscription'
import { countOpenAppointments, getPatientReliability, maxOpenAppointmentsFor } from '@/lib/reputation'

const bookingSchema = z.object({
  professionalId: z.string().min(1),
  scheduledAt: z.string().datetime(),
  modality: z.enum(['ONLINE', 'PRESENCIAL']),
  phone: z.string().trim().optional(),
  reason: z.string().trim().optional(),
})

export async function POST(request: Request) {
  // Qualquer conta pode agendar: nutricionista e admin também se consultam. O papel principal
  // segue sendo o que era — o que se cria aqui é o perfil de paciente dessa mesma pessoa.
  let user
  try {
    user = await requireUser()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'appointment-create')
  if (limited) return limited

  const json = await request.json().catch(() => null)
  const parsed = bookingSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const { professionalId, scheduledAt, modality, phone, reason } = parsed.data
  const scheduledAtDate = new Date(scheduledAt)

  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  if (!professional || professional.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Profissional indisponível' }, { status: 404 })
  }
  // Agendar consigo mesmo travaria o próprio horário e ainda inflaria a própria reputação com
  // consultas que nunca existiram.
  if (professional.userId === user.id) {
    return NextResponse.json({ error: 'Você não pode agendar uma consulta com você mesmo' }, { status: 400 })
  }
  if (professional.modality !== 'AMBOS' && professional.modality !== modality) {
    return NextResponse.json({ error: 'Modalidade não disponível para este profissional' }, { status: 400 })
  }
  if (scheduledAtDate.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Horário inválido' }, { status: 400 })
  }

  // Freemium gate. During the grace period (the default — see lib/subscription.ts) this always
  // passes, so shipping the paywall changes nothing until SUBSCRIPTION_ENFORCED_FROM is set.
  // The message avoids naming the professional's billing state to the patient: whether someone
  // pays for a subscription is between them and the platform, and it isn't the patient's
  // business why a slot can't be booked.
  const entitlements = await getEntitlements(professional.id)
  if (!entitlements.canReceiveBookings) {
    return NextResponse.json(
      { error: 'Este profissional não está aceitando agendamentos pela plataforma no momento.' },
      { status: 403 }
    )
  }

  // Cria o perfil de paciente desta conta se ainda não houver — é o que permite a um
  // nutricionista ou admin se consultar sem deixar de ser o que já era.
  const patientId = await ensurePatientProfile(user.id)

  // Limite de agendamentos simultâneos para quem tem faltas recentes. É a proteção estrutural
  // ao profissional: quem falta em série não consegue travar vários horários pela plataforma.
  // Deliberadamente não é bloqueio — e a mensagem fala do histórico do próprio paciente, para
  // ele, sem que nenhum profissional receba essa informação. Ver lib/reputation.ts.
  const reliability = await getPatientReliability(patientId)
  const maxOpen = maxOpenAppointmentsFor(reliability.level)
  if (maxOpen != null) {
    const open = await countOpenAppointments(patientId)
    if (open >= maxOpen) {
      return NextResponse.json(
        {
          error:
            'Você já tem uma consulta agendada e, por causa de faltas recentes no seu histórico, ' +
            'pode manter apenas uma por vez. Compareça ou cancele a atual para agendar outra.',
        },
        { status: 409 }
      )
    }
  }

  const available = await isSlotAvailable(professionalId, scheduledAtDate)
  if (!available) {
    return NextResponse.json({ error: 'Esse horário acabou de ser reservado. Escolha outro.' }, { status: 409 })
  }

  try {
    // Enrollment resolution + the slot insert happen in one transaction: the row lock taken
    // on a candidate enrollment (if any — see lib/enrollments.ts) serializes concurrent
    // bookings against the same program, and the unique index on (professionalId, slotHeldAt)
    // is the final guard against two people winning the same time slot. Stripe is never
    // called inside this transaction — an external network call while holding a row lock is
    // how a lock ends up held for minutes instead of milliseconds.
    const { appointment, payment } = await prisma.$transaction(async (tx) => {
      // A previous booking that was never confirmed still owns the unique (professionalId,
      // slotHeldAt) key even though availability already treats the slot as free. Release it
      // here, inside the transaction, so the insert below can win the key. The unique index
      // still guarantees exactly one winner if two patients race for the same freed slot.
      await tx.appointment.updateMany({
        where: { professionalId, slotHeldAt: scheduledAtDate, ...staleHoldWhere(new Date()) },
        data: { status: 'EXPIRED', slotHeldAt: null },
      })

      const active = await lockAndResolveEnrollment(tx, patientId, professionalId, scheduledAtDate)
      // price is snapshotted at booking time — later price edits by the professional, or the
      // program ending, must not retroactively change already-booked appointments.
      const price = active ? active.enrollment.pricePerConsultation : professional.price
      const requirement = paymentRequirementFor(professional, active != null)

      const created = await tx.appointment.create({
        data: {
          professionalId,
          patientId,
          scheduledAt: scheduledAtDate,
          slotHeldAt: scheduledAtDate,
          modality,
          price,
          phone: phone || null,
          reason: reason || null,
          // Not a booking yet — the professional has to accept. How long that takes is the
          // response-time signal the ranking uses.
          status: 'AWAITING_CONFIRMATION',
          confirmationDeadline: confirmationDeadlineFor(scheduledAtDate),
          enrollmentId: active?.enrollment.id ?? null,
          // A consultation that needs paying holds the slot on the short payment clock until
          // the money is authorised; one that doesn't goes straight to the professional.
          paymentStatus: requirement.required ? 'PENDING' : 'NOT_REQUIRED',
          paymentDeadline: requirement.required ? paymentHoldDeadline() : null,
        },
      })
      return { appointment: created, payment: requirement }
    })

    // A cobrança é preparada DEPOIS do commit: gerar o código do Pix é barato, mas manter um
    // lock de linha aberto enquanto se faz qualquer outra coisa é como um lock passa de
    // milissegundos a minutos.
    if (payment.required) {
      // Só registra quanto é devido e qual fatia é da plataforma. O paciente paga no link do
      // InfinitePay do profissional, que já carrega o valor — não há código a gerar aqui.
      await recordAppointmentCharge(appointment.id, appointment.price)

      // O pedido de verdade — aquele que o profissional precisa aceitar — só sai quando o
      // pagamento é confirmado: uma cobrança abandonada não pode virar solicitação de uma
      // consulta que nunca existiu. Mas ficar em silêncio até lá fazia o horário sumir da
      // agenda dele sem explicação nenhuma, então vai um aviso informativo agora.
      //
      // Ele não cobra pressa nem prazo, e não precisa: o tempo de resposta é medido de
      // `paidAt` em diante (lib/ranking.ts), então avisar antes não tira ponto de ninguém.
      notifyBookingPendingPayment({
        scheduledAt: scheduledAtDate,
        modality,
        price: appointment.price,
        patientName: user.name,
        patientEmail: user.email,
        professionalName: professional.user.name,
        professionalEmail: professional.user.email,
        professionalUserId: professional.user.id,
      })

      return NextResponse.json({
        id: appointment.id,
        price: appointment.price,
        enrollmentApplied: appointment.enrollmentId != null,
        awaitingConfirmation: true,
        paymentRequired: true,
        paymentUrl: `/pagamento/consulta/${appointment.id}`,
      })
    }

    notifyBookingRequested({
      scheduledAt: scheduledAtDate,
      modality,
      price: appointment.price,
      patientName: user.name,
      patientEmail: user.email,
      professionalName: professional.user.name,
      professionalEmail: professional.user.email,
      professionalUserId: professional.user.id,
    })

    // price is echoed back so the confirmation screen can show what was actually charged —
    // the program price can stop applying between page render and submit.
    return NextResponse.json({
      id: appointment.id,
      price: appointment.price,
      enrollmentApplied: appointment.enrollmentId != null,
      awaitingConfirmation: true,
      paymentRequired: false,
    })
  } catch (e: unknown) {
    if (typeof e === 'object' && e !== null && 'code' in e && e.code === 'P2002') {
      return NextResponse.json({ error: 'Esse horário acabou de ser reservado. Escolha outro.' }, { status: 409 })
    }
    throw e
  }
}
