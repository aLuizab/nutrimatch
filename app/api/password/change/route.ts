import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/password'
import { AuthError, requireUser } from '@/lib/session'
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSessionToken } from '@/lib/jwt'
import { audit } from '@/lib/audit'
import { notifyPasswordChanged } from '@/lib/notifications'
import { LIMITS, rateLimit, tooManyRequests } from '@/lib/rate-limit'

const schema = z.object({
  currentPassword: z.string().min(1, 'Informe sua senha atual'),
  newPassword: z.string().min(8, 'A nova senha precisa ter no mínimo 8 caracteres'),
})

export async function POST(request: Request) {
  let user
  try {
    user = await requireUser()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  // Deliberately the login limit and not the mutation one: this endpoint verifies
  // currentPassword, so an attacker holding a stolen session could otherwise grind the real
  // password at 60 guesses a minute and then lock the owner out.
  const limit = rateLimit(`password-change:${user.id}`, LIMITS.login.limit, LIMITS.login.windowMs)
  if (!limit.allowed) return tooManyRequests(limit, 'Muitas tentativas. Tente novamente mais tarde.')

  const json = await request.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  // Re-authenticating here is what stops someone with a hijacked session from locking the
  // real owner out by changing the password.
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
  }

  const passwordHash = await hashPassword(parsed.data.newPassword)
  const changedAt = new Date()
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordChangedAt: changedAt },
  })

  audit({ actorId: user.id, actorRole: user.role, action: 'PASSWORD_CHANGED' })

  // Aviso de segurança, não de conveniência: se alguém tomou a conta, este e-mail é o único
  // sinal que a pessoa recebe. Por isso não passa por preferência de notificação.
  notifyPasswordChanged({ name: user.name, email: user.email, when: changedAt })

  // Every existing token is now older than passwordChangedAt and therefore dead — including
  // this browser's. Issue a fresh one so the user who just changed their password stays
  // logged in while every other device is signed out.
  const token = await signSessionToken({ userId: user.id, role: user.role })
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
  return response
}
