import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AuthError, requirePatientActor } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { notifyReviewReceived } from '@/lib/notifications'
import { recomputeRankScore } from '@/lib/ranking'

const reviewSchema = z.object({
  appointmentId: z.string().min(1),
  rating: z.number().int().min(1, 'Nota inválida').max(5, 'Nota inválida'),
  comment: z.string().trim().min(5, 'Escreva um comentário com pelo menos 5 caracteres'),
})

export async function POST(request: Request) {
  let user
  try {
    user = await requirePatientActor()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'review-create')
  if (limited) return limited

  const json = await request.json().catch(() => null)
  const parsed = reviewSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const { appointmentId, rating, comment } = parsed.data

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      review: { select: { id: true } },
      professional: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  })
  if (!appointment || appointment.patientId !== user.patient!.id) {
    return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
  }
  if (appointment.status !== 'CONFIRMED' || appointment.scheduledAt > new Date()) {
    return NextResponse.json({ error: 'Só é possível avaliar consultas já realizadas' }, { status: 400 })
  }
  if (appointment.review) {
    return NextResponse.json({ error: 'Você já avaliou esta consulta' }, { status: 409 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.review.create({
        data: {
          // Ownership comes from the appointment row, never from the request body.
          professionalId: appointment.professionalId,
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          rating,
          comment,
        },
      })
      const agg = await tx.review.aggregate({
        where: { professionalId: appointment.professionalId },
        _avg: { rating: true },
        _count: true,
      })
      await tx.professional.update({
        where: { id: appointment.professionalId },
        data: {
          // Rounded at write time — card grids print this value raw.
          rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
          reviewCount: agg._count,
        },
      })
    })
    // Rating is a ranking input, so the score is stale the moment a review lands. Outside the
    // transaction: it reads several tables and must not extend the lock.
    await recomputeRankScore(appointment.professionalId)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'Você já avaliou esta consulta' }, { status: 409 })
    }
    throw e
  }

  notifyReviewReceived({
    professionalUserId: appointment.professional.user.id,
    professionalName: appointment.professional.user.name,
    professionalEmail: appointment.professional.user.email,
    patientFirstName: user.name.split(' ')[0],
    rating,
  })

  return NextResponse.json({ ok: true })
}
