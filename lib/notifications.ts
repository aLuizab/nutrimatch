import { prisma } from './prisma'
import { sendEmail } from './email'
import {
  appointmentCancelled,
  bookingConfirmedPatient,
  bookingReceivedProfessional,
  professionalApproved,
  reviewReceived,
  type AppointmentEmailData,
} from './email-templates'
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
