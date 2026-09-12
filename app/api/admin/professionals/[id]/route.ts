import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { notifyProfessionalApproved } from '@/lib/notifications'
import { audit } from '@/lib/audit'

const statusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']) })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin
  try {
    admin = await requireRole('ADMIN')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(admin.id, 'admin-professional')
  if (limited) return limited

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
  if (existing.status === parsed.data.status) {
    return NextResponse.json({ status: existing.status })
  }

  // Approving is also the moment the admin confirms the CRN against the CFN portal, so it
  // records who verified it and when. Never overwritten on re-activation of a suspended
  // professional — the original verification stands.
  const isFirstApproval = existing.status === 'PENDING' && parsed.data.status === 'ACTIVE'
  const professional = await prisma.professional.update({
    where: { id },
    data: {
      status: parsed.data.status,
      ...(isFirstApproval && existing.crnVerifiedAt == null
        ? { crnVerifiedAt: new Date(), crnVerifiedBy: admin.email }
        : {}),
    },
  })

  // Approving, suspending or reverting a professional decides whether a person can practise on
  // this platform, and the CRN verification stamp is attached to it. LGPD Art. 37 aside, an
  // approval nobody can trace back to an admin is exactly the record you want when a
  // registration is later challenged.
  audit({
    actorId: admin.id,
    actorRole: admin.role,
    action: 'PROFESSIONAL_STATUS_CHANGED',
    subjectId: id,
    metadata: {
      from: existing.status,
      to: parsed.data.status,
      professionalName: existing.user.name,
      crn: existing.crn,
      crnVerified: isFirstApproval && existing.crnVerifiedAt == null,
    },
  })

  // Welcome e-mail only on the first approval (PENDING → ACTIVE) — re-activating a
  // suspended professional or clicking approve twice must not re-send it.
  if (existing.status === 'PENDING' && parsed.data.status === 'ACTIVE') {
    notifyProfessionalApproved(existing.user.name, existing.user.email)
  }

  return NextResponse.json({ status: professional.status })
}
