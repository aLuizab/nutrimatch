import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { consumeResetToken } from '@/lib/password-reset'
import { LIMITS, clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'A senha precisa ter no mínimo 8 caracteres'),
})

export async function POST(request: Request) {
  const limit = rateLimit(
    `pwset:${clientIp(request)}`,
    LIMITS.passwordReset.limit,
    LIMITS.passwordReset.windowMs
  )
  if (!limit.allowed) {
    return tooManyRequests(limit, 'Muitas tentativas. Tente novamente mais tarde.')
  }

  const json = await request.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const userId = await consumeResetToken(parsed.data.token)
  if (!userId) {
    return NextResponse.json({ error: 'Link inválido ou expirado. Solicite um novo.' }, { status: 400 })
  }

  const passwordHash = await hashPassword(parsed.data.password)
  // passwordChangedAt is what actually revokes the old sessions — see lib/session.ts.
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, passwordChangedAt: new Date() },
  })

  audit({ actorId: user.id, actorRole: user.role, action: 'PASSWORD_RESET_COMPLETED' })

  return NextResponse.json({ ok: true })
}
