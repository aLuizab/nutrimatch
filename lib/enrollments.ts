import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'

// Single source of truth for "does this booking fall inside an active program?".
// Both the booking API and the /agendamento page call this — if they each implemented the
// rule they would drift, and the page would show a price the API doesn't honor.
export async function resolveActiveEnrollment(patientId: string, professionalId: string, scheduledAt: Date) {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      patientId,
      professionalId,
      status: 'ACTIVE',
      startedAt: { lte: scheduledAt },
      // Expiry is judged against the CONSULTATION date, not "now" — otherwise on the program's
      // last day a patient could book every remaining consultation months into the future at
      // the program price.
      endsAt: { gte: scheduledAt },
    },
    orderBy: { startedAt: 'desc' },
  })
  if (!enrollment) return null

  const used = await prisma.appointment.count({
    where: { enrollmentId: enrollment.id, status: 'CONFIRMED' },
  })
  if (used >= enrollment.consultations) return null

  return { enrollment, used, remaining: enrollment.consultations - used }
}

// Transactional variant for the booking route only: takes a row lock on the candidate
// enrollment BEFORE counting, so two concurrent bookings on the program's last remaining
// consultation can't both win it (READ COMMITTED has no predicate lock — counting inside a
// plain $transaction, without this lock, does not prevent that). Read-only call sites
// (dashboards, the /agendamento page) should keep using resolveActiveEnrollment above —
// locking there would serialize page views for no reason.
export async function lockAndResolveEnrollment(
  tx: Prisma.TransactionClient,
  patientId: string,
  professionalId: string,
  scheduledAt: Date
) {
  const enrollment = await tx.enrollment.findFirst({
    where: {
      patientId,
      professionalId,
      status: 'ACTIVE',
      startedAt: { lte: scheduledAt },
      endsAt: { gte: scheduledAt },
    },
    orderBy: { startedAt: 'desc' },
  })
  if (!enrollment) return null

  await tx.$queryRaw`SELECT id FROM "Enrollment" WHERE id = ${enrollment.id} FOR UPDATE`

  const used = await tx.appointment.count({
    where: { enrollmentId: enrollment.id, status: 'CONFIRMED' },
  })
  if (used >= enrollment.consultations) return null

  return { enrollment, used, remaining: enrollment.consultations - used }
}

// Current state of a patient's program with a professional, regardless of any specific booking
// date — for dashboards and cards.
export async function getActiveEnrollmentSummary(patientId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { patientId, status: 'ACTIVE', endsAt: { gte: new Date() } },
    orderBy: { startedAt: 'desc' },
    include: {
      carePlan: { select: { name: true } },
      professional: { include: { user: { select: { name: true } } } },
      _count: { select: { appointments: { where: { status: 'CONFIRMED' } } } },
    },
  })
  if (!enrollment) return null

  const used = enrollment._count.appointments
  return {
    id: enrollment.id,
    planName: enrollment.carePlan.name,
    professionalId: enrollment.professionalId,
    professionalName: enrollment.professional.user.name,
    used,
    total: enrollment.consultations,
    remaining: Math.max(0, enrollment.consultations - used),
    endsAt: enrollment.endsAt,
    pricePerConsultation: enrollment.pricePerConsultation,
    listPriceAtEnrollment: enrollment.listPriceAtEnrollment,
  }
}
