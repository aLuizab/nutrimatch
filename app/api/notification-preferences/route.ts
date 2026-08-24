import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireUser } from '@/lib/session'

const prefsSchema = z
  .object({
    notifyBooking: z.boolean().optional(),
    notifyCancellation: z.boolean().optional(),
    notifyReviews: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nada para atualizar' })

export async function PATCH(request: Request) {
  let user
  try {
    user = await requireUser()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const json = await request.json().catch(() => null)
  const parsed = prefsSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  await prisma.user.update({ where: { id: user.id }, data: parsed.data })
  return NextResponse.json({ ok: true })
}
