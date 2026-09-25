import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { notifyCancelled, notifyMarkedNoShow, notifyRescheduled } from '@/lib/notifications'
import { recomputeRankScore } from '@/lib/ranking'
import { isSlotAvailable } from '@/lib/availability'
import { isWithinCancelRefundWindow, isWithinRescheduleWindow } from '@/lib/appointment-status'
import { formatCents } from '@/lib/money'

// Cinco ações mutuamente exclusivas dividem esta rota: cancelar (qualquer um dos dois donos,
// só consulta futura), remarcar o horário (paciente dono, só CONFIRMED), escrever o resumo
// pós-consulta (profissional dono, só consulta passada), marcar comparecimento (profissional
// dono, só CONFIRMED passada) e contestar uma falta (paciente dono).
//
// **Aceitar não está mais aqui.** Quem marca a consulta é a conferência do pagamento pelo admin
// (ver confirmAppointmentPixPayment); o profissional não recebe mais um pedido para aprovar. O
// que ele tem é a saída: cancelar o que não puder atender, com o valor voltando integralmente
// ao paciente e o cancelamento pesando na confiabilidade dele.
const actionSchema = z.union([
  z.object({ status: z.literal('CANCELLED') }).strict(),
  z.object({ reschedule: z.string().datetime() }).strict(),
  z.object({ summary: z.string().trim().min(1, 'O resumo não pode ficar vazio').max(4000) }).strict(),
  z.object({ attendance: z.enum(['ATTENDED', 'NO_SHOW']) }).strict(),
  z
    .object({
      contestAttendance: z.string().trim().min(1, 'Explique o que aconteceu').max(1000),
    })
    .strict(),
])

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const limited = guardMutation(user.id, 'appointment-update')
  if (limited) return limited

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: { include: { user: { select: { id: true, name: true, email: true } } } },
      professional: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  })
  if (!appointment) return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })

  const isOwningPatient = user.role === 'PATIENT' && user.patient?.id === appointment.patientId
  const isOwningProfessional = user.role === 'PROFESSIONAL' && user.professional?.id === appointment.professionalId
  if (!isOwningPatient && !isOwningProfessional) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const json = await request.json().catch(() => null)
  const parsed = actionSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }
  const action = parsed.data
  const now = new Date()

  if ('status' in action) {
    if (appointment.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Esta consulta já foi cancelada' }, { status: 400 })
    }
    if (appointment.scheduledAt <= now) {
      return NextResponse.json({ error: 'Não é possível cancelar uma consulta já realizada' }, { status: 400 })
    }
    // O dinheiro primeiro. Não há reserva em cartão para soltar: o pagamento é capturado no
    // instante em que o paciente paga no link, então todo cancelamento de consulta paga vira
    // dívida de devolução, nunca uma autorização que se deixa expirar.
    //
    // Duas regras, e a diferença entre elas é de quem foi a decisão:
    //   - Paciente cancela: devolve só com CANCEL_REFUND_CUTOFF_HOURS de antecedência (ver
    //     lib/appointment-status.ts e /politica-de-cancelamento). Passado isso o cancelamento
    //     continua valendo, só sem devolução — e ele ainda pode remarcar, numa janela mais curta,
    //     no branch de RESCHEDULE abaixo.
    //   - Profissional cancela: devolve sempre, integralmente. O paciente não causou isso, então
    //     não há janela a ponderar — quem desmarca uma consulta que a plataforma já tinha dado
    //     como marcada não transfere esse custo para quem pagou.
    //
    // O que sai daqui é quanto a plataforma passa a DEVER ao paciente, e é só um cálculo: o dinheiro entrou por um link do InfinitePay e só sai de
    // volta quando alguém mandar, à mão. O cálculo fica em pé porque a obrigação existe
    // independentemente de haver automação — quem cancela dentro da janela tem direito ao
    // dinheiro, e apagar a conta não apaga a dívida.
    //
    // O que falta é a fila de devoluções pendentes no painel do admin. Enquanto ela não existe,
    // este valor é informado ao paciente e registrado aqui, e a devolução depende de alguém
    // olhar. É uma lacuna conhecida, não um descuido.
    let refundedCents = 0
    if (appointment.paymentStatus === 'PAID') {
      const patientWithinRefundWindow = isOwningPatient && isWithinCancelRefundWindow(appointment.scheduledAt, now)
      if (patientWithinRefundWindow || isOwningProfessional) {
        refundedCents = appointment.amountCents ?? 0
      }
    }
    // PENDING e AWAITING_REVIEW não geram devolução: nada foi confirmado como recebido, então
    // não há o que devolver — se o dinheiro tiver entrado mesmo, a conferência é que resolve.

    // slotHeldAt: null frees the slot immediately — see the schema comment on this column.
    // A consultation booked inside a package needs nothing extra here: the package's used
    // count only sees CONFIRMED/AWAITING rows, so cancelling gives the credit straight back.
    // cancelledBy é o que permite separar depois "o profissional desmarcou" (falha dele, pesa
    // na confiabilidade) de "o paciente desmarcou" (não pesa) — ver lib/reputation.ts.
    await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        slotHeldAt: null,
        cancelledAt: now,
        cancelledBy: isOwningPatient ? 'PATIENT' : 'PROFESSIONAL',
      },
    })

    // O repasse desta consulta não existe mais: ela não vai acontecer, então não há o que
    // transferir. CANCELLED e não apagar, para o histórico continuar mostrando que existiu.
    // updateMany e não update porque consulta sem pagamento confirmado não tem repasse nenhum.
    await prisma.payout.updateMany({
      where: { appointmentId: id, status: { in: ['PENDING', 'PROCESSING'] } },
      data: { status: 'CANCELLED' },
    })

    // Cancelar depois de ter confirmado conta contra a confiabilidade do profissional; por isso
    // o recálculo acontece aqui e não só na marcação de presença.
    if (isOwningProfessional && appointment.confirmedAt) {
      await recomputeRankScore(appointment.professionalId)
    }

    notifyCancelled(
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
      isOwningPatient ? 'PATIENT' : 'PROFESSIONAL'
    )

    return NextResponse.json({
      ok: true,
      refunded: refundedCents > 0,
      refundedLabel: refundedCents > 0 ? formatCents(refundedCents) : null,
    })
  }

  if ('reschedule' in action) {
    if (!isOwningPatient) {
      return NextResponse.json({ error: 'Apenas o paciente pode remarcar a consulta' }, { status: 403 })
    }
    if (appointment.status !== 'CONFIRMED') {
      return NextResponse.json({ error: 'Só é possível remarcar uma consulta confirmada' }, { status: 400 })
    }
    if (!isWithinRescheduleWindow(appointment.scheduledAt, now)) {
      return NextResponse.json(
        { error: 'Muito perto do horário marcado para remarcar. Você ainda pode cancelar.' },
        { status: 400 }
      )
    }

    const newScheduledAt = new Date(action.reschedule)
    if (newScheduledAt.getTime() <= now.getTime()) {
      return NextResponse.json({ error: 'Escolha um horário futuro' }, { status: 400 })
    }

    const available = await isSlotAvailable(appointment.professionalId, newScheduledAt)
    if (!available) {
      return NextResponse.json({ error: 'Esse horário não está disponível. Escolha outro.' }, { status: 409 })
    }

    const oldScheduledAt = appointment.scheduledAt
    try {
      // Same status, same payment, same everything — only the time and the slot it holds move.
      // No re-confirmation needed: the professional already agreed to see this patient, just not
      // at this exact hour, and re-running the whole payment/confirmation dance over a time
      // change would be a worse experience for a strictly smaller change.
      await prisma.appointment.update({
        where: { id },
        data: { scheduledAt: newScheduledAt, slotHeldAt: newScheduledAt },
      })
    } catch (e: unknown) {
      if (typeof e === 'object' && e !== null && 'code' in e && e.code === 'P2002') {
        return NextResponse.json({ error: 'Esse horário acabou de ser reservado. Escolha outro.' }, { status: 409 })
      }
      throw e
    }

    notifyRescheduled({
      scheduledAt: newScheduledAt,
      oldScheduledAt,
      modality: appointment.modality,
      price: appointment.price,
      patientName: appointment.patient.user.name,
      patientEmail: appointment.patient.user.email,
      professionalName: appointment.professional.user.name,
      professionalEmail: appointment.professional.user.email,
      professionalUserId: appointment.professional.user.id,
    })

    return NextResponse.json({ ok: true })
  }

  if ('attendance' in action) {
    if (!isOwningProfessional) {
      return NextResponse.json({ error: 'Apenas o profissional pode marcar o comparecimento' }, { status: 403 })
    }
    if (appointment.status !== 'CONFIRMED') {
      return NextResponse.json({ error: 'Só consulta confirmada tem comparecimento a marcar' }, { status: 400 })
    }
    if (appointment.scheduledAt > now) {
      return NextResponse.json({ error: 'A consulta ainda não aconteceu' }, { status: 400 })
    }
    // Marcação em disputa é decisão do paciente e não pode ser sobrescrita pelo profissional —
    // senão "contestar" não significa nada.
    if (appointment.attendance === 'CONTESTED') {
      return NextResponse.json(
        { error: 'O paciente contestou esta marcação. Fale com o suporte para resolver.' },
        { status: 409 }
      )
    }

    await prisma.appointment.update({
      where: { id },
      data: { attendance: action.attendance, attendanceMarkedAt: now },
    })
    // Confiabilidade do profissional e nível saem daqui — ver recomputeRankScore.
    await recomputeRankScore(appointment.professionalId)

    if (action.attendance === 'NO_SHOW') {
      notifyMarkedNoShow({
        appointmentId: id,
        scheduledAt: appointment.scheduledAt,
        modality: appointment.modality,
        price: appointment.price,
        patientName: appointment.patient.user.name,
        patientEmail: appointment.patient.user.email,
        professionalName: appointment.professional.user.name,
        professionalEmail: appointment.professional.user.email,
        professionalUserId: appointment.professional.user.id,
      })
    }

    return NextResponse.json({ ok: true })
  }

  if ('contestAttendance' in action) {
    if (!isOwningPatient) {
      return NextResponse.json({ error: 'Apenas o paciente pode contestar' }, { status: 403 })
    }
    if (appointment.attendance !== 'NO_SHOW') {
      return NextResponse.json({ error: 'Não há falta registrada nesta consulta' }, { status: 400 })
    }

    await prisma.appointment.update({
      where: { id },
      data: {
        attendance: 'CONTESTED',
        attendanceContestedAt: now,
        attendanceNote: action.contestAttendance,
      },
    })
    // CONTESTED sai da conta dos dois lados, então a reputação do profissional muda também.
    await recomputeRankScore(appointment.professionalId)

    return NextResponse.json({ ok: true })
  }

  if (!isOwningProfessional) {
    return NextResponse.json({ error: 'Apenas o profissional pode escrever o resumo' }, { status: 403 })
  }
  if (appointment.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Consulta cancelada não tem resumo' }, { status: 400 })
  }
  if (appointment.scheduledAt > now) {
    return NextResponse.json({ error: 'O resumo só pode ser escrito após a consulta' }, { status: 400 })
  }
  await prisma.appointment.update({ where: { id }, data: { summary: action.summary } })
  return NextResponse.json({ ok: true })
}
