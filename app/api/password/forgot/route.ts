import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createResetToken } from '@/lib/password-reset'
import { sendEmail } from '@/lib/email'
import { passwordResetEmail } from '@/lib/email-templates'
import { appUrl } from '@/lib/env'
import { LIMITS, clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'

const schema = z.object({ email: z.string().trim().toLowerCase().email() })

export async function POST(request: Request) {
  const limit = rateLimit(
    `pwreset:${clientIp(request)}`,
    LIMITS.passwordReset.limit,
    LIMITS.passwordReset.windowMs
  )
  if (!limit.allowed) {
    return tooManyRequests(limit, 'Muitas solicitações. Tente novamente mais tarde.')
  }

  const json = await request.json().catch(() => null)
  const parsed = schema.safeParse(json)

  // Always the same response, whether or not the email exists — unlike registration (which
  // must tell the user the address is taken), nothing here requires disclosing it, so this
  // endpoint genuinely reveals nothing. No Set-Cookie difference either.
  const generic = NextResponse.json({
    ok: true,
    message: 'Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha.',
  })
  if (!parsed.success) return generic

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (!user) return generic

  const raw = await createResetToken(user.id)
  const link = `${appUrl()}/redefinir-senha?token=${encodeURIComponent(raw)}`

  audit({ actorId: user.id, actorRole: user.role, action: 'PASSWORD_RESET_REQUESTED' })

  // Awaited, unlike the fire-and-forget notification layer: if the email fails the user must
  // not be told the link is on its way.
  try {
    await sendEmail({ to: user.email, ...passwordResetEmail(user.name, link) })
  } catch (e) {
    console.error('[password:forgot] email failed', e)
  }

  return generic
}
