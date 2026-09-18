import { prisma } from './prisma'
import { sendEmail } from './email'
import {
  appointmentCancelled,
  appointmentRescheduled,
  bookingConfirmedPatient,
  bookingReceivedProfessional,
  bookingRequestedPatient,
  bookingRequestProfessional,
  markedNoShow,
  professionalApproved,
  reviewReceived,
  appointmentExpiredPatient,
  paymentConfirmedPatient,
  paymentDeclaredPatient,
  paymentPendingAdmin,
  paymentRejectedPatient,
  payoutPaidProfessional,
  subscriptionRecordedProfessional,
  welcomePatient,
  welcomeProfessional,
  passwordChangedEmail,
  platformAnnouncement,
  type AppointmentEmailData,
} from './email-templates'
import { appUrl } from './stripe'
import { unsubscribeUrl } from './unsubscribe'
import { formatDateBR, formatPrice, formatTimeBR, modalityLabel } from './format'
import type { Modality } from '@prisma/client'

// Central notification layer: each function checks the recipient's preference, picks the
// template, and fires without awaiting delivery. Call these AFTER the database commit —
// never inside a transaction — so a slow/failed e-mail can never affect the write.
function fire(promise: Promise<void>) {
  void promise.catch((e) => console.error('[notifications]', e))
}

interface AppointmentContext {
  scheduledAt: Date
  modality: Modality
  price: number
  patientName: string
  patientEmail: string
  professionalName: string
  professionalEmail: string
  professionalUserId: string
}

function toEmailData(ctx: AppointmentContext): AppointmentEmailData {
  return {
    patientName: ctx.patientName,
    professionalName: ctx.professionalName,
    dateLabel: formatDateBR(ctx.scheduledAt),
    timeLabel: formatTimeBR(ctx.scheduledAt),
    modalityLabel: modalityLabel(ctx.modality),
    priceLabel: formatPrice(ctx.price),
  }
}

/**
 * Booking created, waiting on the professional. The professional's e-mail is the one that
 * matters here — it's the call to action that starts their response-time clock — so it is
 * NOT gated on notifyBooking: a professional who silenced booking notifications would
 * otherwise silently miss requests and have their ranking punished for it.
 */
export function notifyBookingRequested(ctx: AppointmentContext) {
  const data = toEmailData(ctx)
  fire(sendEmail({ to: ctx.patientEmail, ...bookingRequestedPatient(data) }))
  fire(sendEmail({ to: ctx.professionalEmail, ...bookingRequestProfessional(data) }))
}

export function notifyBookingConfirmed(ctx: AppointmentContext) {
  const data = toEmailData(ctx)
  // Patient e-mail is transactional — always sent, no preference gate.
  fire(sendEmail({ to: ctx.patientEmail, ...bookingConfirmedPatient(data) }))
  fire(
    (async () => {
      const pref = await prisma.user.findUnique({
        where: { id: ctx.professionalUserId },
        select: { notifyBooking: true },
      })
      if (pref?.notifyBooking) {
        await sendEmail({ to: ctx.professionalEmail, ...bookingReceivedProfessional(data) })
      }
    })()
  )
}

export function notifyCancelled(ctx: AppointmentContext, cancelledBy: 'PATIENT' | 'PROFESSIONAL') {
  const data = toEmailData(ctx)
  const byLabel = cancelledBy === 'PATIENT' ? 'pelo paciente' : 'pelo profissional'
  if (cancelledBy === 'PATIENT') {
    fire(
      (async () => {
        const pref = await prisma.user.findUnique({
          where: { id: ctx.professionalUserId },
          select: { notifyCancellation: true },
        })
        if (pref?.notifyCancellation) {
          await sendEmail({
            to: ctx.professionalEmail,
            ...appointmentCancelled({ ...data, recipientName: ctx.professionalName, cancelledBy: byLabel }),
          })
        }
      })()
    )
  } else {
    fire(
      sendEmail({
        to: ctx.patientEmail,
        ...appointmentCancelled({ ...data, recipientName: ctx.patientName, cancelledBy: byLabel }),
      })
    )
  }
}

/**
 * A consulta mudou de horário — nem paciente nem profissional podem descobrir isso depois, por
 * acaso, então nenhuma das duas cópias é filtrada por preferência de notificação (diferente de
 * notifyBookingConfirmed, que é uma confirmação de algo que o profissional já esperava).
 */
export function notifyRescheduled(ctx: AppointmentContext & { oldScheduledAt: Date }) {
  const data = toEmailData(ctx)
  const timing = {
    oldDateLabel: formatDateBR(ctx.oldScheduledAt),
    oldTimeLabel: formatTimeBR(ctx.oldScheduledAt),
  }
  fire(sendEmail({ to: ctx.patientEmail, ...appointmentRescheduled({ ...data, ...timing, recipientName: ctx.patientName }) }))
  fire(sendEmail({ to: ctx.professionalEmail, ...appointmentRescheduled({ ...data, ...timing, recipientName: ctx.professionalName }) }))
}

/**
 * Uma falta foi registrada. Sempre enviado, sem filtro de preferência: é o único aviso que o
 * paciente recebe de algo que restringe a conta dele, e sem ele o direito de contestar existe
 * só no papel — ninguém contesta o que não sabe que aconteceu.
 */
export function notifyMarkedNoShow(ctx: AppointmentContext & { appointmentId: string }) {
  const data = toEmailData(ctx)
  fire(
    sendEmail({
      to: ctx.patientEmail,
      ...markedNoShow({ ...data, contestUrl: `${appUrl()}/patient/consultas` }),
    })
  )
}

export function notifyProfessionalApproved(name: string, email: string) {
  fire(sendEmail({ to: email, ...professionalApproved(name) }))
}

export function notifyReviewReceived(args: {
  professionalUserId: string
  professionalName: string
  professionalEmail: string
  patientFirstName: string
  rating: number
}) {
  fire(
    (async () => {
      const pref = await prisma.user.findUnique({
        where: { id: args.professionalUserId },
        select: { notifyReviews: true },
      })
      if (pref?.notifyReviews) {
        await sendEmail({
          to: args.professionalEmail,
          ...reviewReceived(args.professionalName, args.patientFirstName, args.rating),
        })
      }
    })()
  )
}

// ── Dinheiro ────────────────────────────────────────────────────────────────

/**
 * Avisa quem precisa saber que alguém declarou um pagamento: o paciente, para ter registro de
 * que o aviso chegou, e os admins, porque ninguém confere um extrato que não sabe que existe.
 *
 * Os admins são buscados no banco em vez de virem de uma variável de ambiente: uma lista fixa
 * envelhece no dia em que alguém entra ou sai da operação, e a diferença aparece como pagamento
 * que ninguém conferiu.
 */
export function notifyPaymentDeclared(args: {
  patientName: string
  patientEmail: string
  what: string
  amountLabel: string
  note?: string | null
}) {
  fire(
    sendEmail({
      to: args.patientEmail,
      ...paymentDeclaredPatient({
        patientName: args.patientName,
        what: args.what,
        amountLabel: args.amountLabel,
      }),
    })
  )
  fire(
    (async () => {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } })
      const template = paymentPendingAdmin({
        what: args.what,
        amountLabel: args.amountLabel,
        who: args.patientName,
        note: args.note ?? null,
      })
      await Promise.all(admins.map((a) => sendEmail({ to: a.email, ...template })))
    })()
  )
}

export function notifyPaymentConfirmed(args: {
  patientName: string
  patientEmail: string
  what: string
  amountLabel: string
}) {
  fire(sendEmail({ to: args.patientEmail, ...paymentConfirmedPatient(args) }))
}

export function notifyPaymentRejected(args: {
  patientName: string
  patientEmail: string
  what: string
  amountLabel: string
  reason?: string | null
}) {
  fire(sendEmail({ to: args.patientEmail, ...paymentRejectedPatient(args) }))
}

/** Repasse é dinheiro saindo daqui para a conta de alguém: nunca em silêncio. */
export function notifyPayoutPaid(args: {
  professionalName: string
  professionalEmail: string
  amountLabel: string
  feeLabel: string
  grossLabel: string
  pixKeyMasked: string
}) {
  const { professionalEmail, ...data } = args
  fire(sendEmail({ to: professionalEmail, ...payoutPaidProfessional(data) }))
}

export function notifySubscriptionRecorded(args: {
  professionalName: string
  professionalEmail: string
  amountLabel: string
  untilLabel: string
}) {
  const { professionalEmail, ...data } = args
  fire(sendEmail({ to: professionalEmail, ...subscriptionRecordedProfessional(data) }))
}

/** O profissional deixou o prazo passar. Quem precisa saber é o paciente, que ficou esperando. */
export function notifyAppointmentExpired(ctx: AppointmentContext) {
  fire(sendEmail({ to: ctx.patientEmail, ...appointmentExpiredPatient(toEmailData(ctx)) }))
}

// ── Conta ───────────────────────────────────────────────────────────────────

/**
 * Boas-vindas. Conteúdo diferente por papel porque as duas pessoas precisam de coisas
 * diferentes: a paciente precisa saber o que dá para fazer aqui, e o nutricionista precisa
 * saber que está em análise e o que deixar pronto enquanto espera.
 */
export function notifyWelcome(args: {
  name: string
  email: string
  role: 'PATIENT' | 'PROFESSIONAL' | 'ADMIN'
  monthlyLabel?: string
}) {
  if (args.role === 'ADMIN') return
  const base = appUrl()
  if (args.role === 'PROFESSIONAL') {
    fire(
      sendEmail({
        to: args.email,
        ...welcomeProfessional({
          name: args.name,
          monthlyLabel: args.monthlyLabel ?? 'R$ 9,90/mês',
          settingsUrl: `${base}/configuracoes`,
        }),
      })
    )
    return
  }
  fire(sendEmail({ to: args.email, ...welcomePatient({ name: args.name, searchUrl: `${base}/resultados` }) }))
}

/**
 * Aviso de segurança: nunca passa por preferência de notificação. Se alguém tomou a conta, este
 * e-mail é o único sinal que a pessoa recebe, e silenciá-lo seria silenciar o alarme.
 */
export function notifyPasswordChanged(args: { name: string; email: string; when: Date }) {
  fire(
    sendEmail({
      to: args.email,
      ...passwordChangedEmail({
        name: args.name,
        whenLabel: `${formatDateBR(args.when)} às ${formatTimeBR(args.when)}`,
        resetUrl: `${appUrl()}/esqueci-senha`,
      }),
    })
  )
}

export type AnnouncementAudience = 'TODOS' | 'PROFISSIONAIS' | 'PACIENTES'

/**
 * Comunicado da plataforma.
 *
 * Diferente de todo o resto deste arquivo, aqui se espera o envio terminar: quem manda precisa
 * saber quantos saíram e quantos falharam, e um disparo em massa que falha em silêncio é pior
 * que não ter a funcionalidade. Envia em série de propósito — a lista é pequena e sequencial
 * mantém a plataforma longe do limite de taxa do provedor.
 */
export async function sendAnnouncement(args: {
  audience: AnnouncementAudience
  title: string
  bodyHtml: string
}): Promise<{ enviados: number; ignorados: number }> {
  const role =
    args.audience === 'PROFISSIONAIS' ? 'PROFESSIONAL' : args.audience === 'PACIENTES' ? 'PATIENT' : undefined

  const destinatarios = await prisma.user.findMany({
    // notifyNews: true é o filtro que torna o descadastro real em vez de decorativo.
    where: { notifyNews: true, ...(role ? { role } : {}) },
    select: { id: true, name: true, email: true },
  })

  const base = appUrl()
  let enviados = 0
  for (const u of destinatarios) {
    try {
      await sendEmail({
        to: u.email,
        ...platformAnnouncement({
          name: u.name.split(' ')[0],
          title: args.title,
          bodyHtml: args.bodyHtml,
          unsubscribeUrl: unsubscribeUrl(base, u.id),
        }),
      })
      enviados++
    } catch (e) {
      console.error('[announcement] falhou para', u.email, e)
    }
  }

  const total = await prisma.user.count({ where: role ? { role } : {} })
  return { enviados, ignorados: total - destinatarios.length }
}
