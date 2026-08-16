import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Nome é obrigatório'),
  crn: z.string().trim().min(3, 'CRN é obrigatório'),
  phone: z.string().trim().optional(),
  specialty: z.string().trim().min(2, 'Especialidade é obrigatória'),
  city: z.string().trim().min(2, 'Cidade é obrigatória'),
  price: z.coerce.number().int().min(1, 'Valor inválido'),
  bio: z.string().trim().optional(),
})

export async function PATCH(request: Request) {
  let user
  try {
    user = await requireRole('PROFESSIONAL')
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
    prisma.professional.update({
      where: { id: user.professional!.id },
      data: {
        crn: data.crn,
        specialty: data.specialty,
        city: data.city,
        price: data.price,
        bio: data.bio || '',
      },
    }),
  ])

  return NextResponse.json({ ok: true })
}
