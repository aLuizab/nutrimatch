import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { fakeVerifyPassword, verifyPassword } from '@/lib/password'
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSessionToken } from '@/lib/jwt'
import { LIMITS, clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { configFailure, unexpectedFailure } from '@/lib/api-failures'

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

const ROLE_HOME = {
  PROFESSIONAL: '/dashboard',
  PATIENT: '/patient/dashboard',
  ADMIN: '/admin/dashboard',
} as const

export async function POST(request: Request) {
  const limit = rateLimit(`login:${clientIp(request)}`, LIMITS.login.limit, LIMITS.login.windowMs)
  if (!limit.allowed) {
    return tooManyRequests(limit, 'Muitas tentativas de login. Tente novamente em alguns minutos.')
  }

  // signSessionToken() throws on a missing or too-short JWT_SECRET, and it only runs after the
  // password has already been verified — so a misconfigured deploy used to answer a perfectly
  // correct login with a 500, which the browser reported as a connection error.
  const misconfigured = configFailure()
  if (misconfigured) return misconfigured

  const json = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'E-mail ou senha inválidos' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (!user) {
      // Burn the same time a real bcrypt comparison would, so response timing doesn't reveal
      // whether the email exists.
      await fakeVerifyPassword(parsed.data.password)
      return NextResponse.json({ error: 'E-mail ou senha inválidos' }, { status: 401 })
    }
    if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: 'E-mail ou senha inválidos' }, { status: 401 })
    }

    const token = await signSessionToken({ userId: user.id, role: user.role })

    const response = NextResponse.json({ redirectTo: ROLE_HOME[user.role] })
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    })
    return response
  } catch (e) {
    return unexpectedFailure('login', e)
  }
}
