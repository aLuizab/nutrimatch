import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'
import { notifyProfessionalApproved } from '@/lib/notifications'

const statusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']) })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('ADMIN')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const { id } = await params
  const json = await request.json().catch(() => null)
  const parsed = statusSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const existing = await prisma.professional.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
  }

  const professional = await prisma.professional.update({
    where: { id },
    data: { status: parsed.data.status },
  })

  // Welcome e-mail only on the first approval (PENDING → ACTIVE) — re-activating a
  // suspended professional or clicking approve twice must not re-send it.
  if (existing.status === 'PENDING' && parsed.data.status === 'ACTIVE') {
    notifyProfessionalApproved(existing.user.name, existing.user.email)
  }

  return NextResponse.json({ status: professional.status })
}
