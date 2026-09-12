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
  type AppointmentEmailData,
} from './email-templates'
import { appUrl } from './stripe'
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
