import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Nome é obrigatório'),
  phone: z.string().trim().optional(),
  birthDate: z.string().trim().optional(),
  goal: z.string().trim().optional(),
  city: z.string().trim().optional(),
})

export async function PATCH(request: Request) {
  let user
  try {
    user = await requireRole('PATIENT')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const json = await request.json().catch(() => null)
  const parsed = profileSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const data = parsed.data

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { name: data.name, phone: data.phone || null } }),
    prisma.patient.update({
      where: { id: user.patient!.id },
      data: {
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        goal: data.goal || null,
        city: data.city || null,
      },
    }),
  ])

  return NextResponse.json({ ok: true })
}
