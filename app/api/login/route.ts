import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { fakeVerifyPassword, verifyPassword } from '@/lib/password'
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSessionToken } from '@/lib/jwt'
import {
  LIMITS,
  clearRateLimit,
  clientIp,
  peekRateLimit,
  recordFailure,
  tooManyRequests,
} from '@/lib/rate-limit'
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

const BLOQUEADO = 'Muitas tentativas de login. Tente novamente em alguns minutos.'

export async function POST(request: Request) {
  // signSessionToken() throws on a missing or too-short JWT_SECRET, and it only runs after the
  // password has already been verified — so a misconfigured deploy used to answer a perfectly
  // correct login with a 500, which the browser reported as a connection error.
  const misconfigured = configFailure()
  if (misconfigured) return misconfigured

  // O corpo é lido ANTES do limitador porque o e-mail entra na chave. Um corpo inválido sai
  // com 400 sem gastar cota: não é uma tentativa de adivinhar senha, é um cliente quebrado.
  const json = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'E-mail ou senha inválidos' }, { status: 400 })
  }

  // Dois baldes: um por conta (apertado) e um por endereço (folgado). O e-mail já vem
  // normalizado pelo zod — sem isso "A@b.com" e "a@b.com" seriam contas diferentes aqui.
  const ip = clientIp(request)
  const porConta = `login:${ip}:${parsed.data.email}`
  const porIp = `login-ip:${ip}`

  const conta = peekRateLimit(porConta, LIMITS.login.limit, LIMITS.login.windowMs)
  if (!conta.allowed) return tooManyRequests(conta, BLOQUEADO)

  const endereco = peekRateLimit(porIp, LIMITS.loginPerIp.limit, LIMITS.loginPerIp.windowMs)
  if (!endereco.allowed) return tooManyRequests(endereco, BLOQUEADO)

  /** Senha errada ou conta inexistente contam igual — senão a cota vira um oráculo de e-mails. */
  const cobrarFalha = () => {
    recordFailure(porConta, LIMITS.login.windowMs)
    recordFailure(porIp, LIMITS.loginPerIp.windowMs)
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (!user) {
      // Burn the same time a real bcrypt comparison would, so response timing doesn't reveal
      // whether the email exists.
      await fakeVerifyPassword(parsed.data.password)
      cobrarFalha()
      return NextResponse.json({ error: 'E-mail ou senha inválidos' }, { status: 401 })
    }
    if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
      cobrarFalha()
      return NextResponse.json({ error: 'E-mail ou senha inválidos' }, { status: 401 })
    }

    // Acertou: o balde da conta é esquecido, então errar duas vezes e acertar na terceira não
    // deixa resíduo. O balde do IP NÃO é limpo de propósito — senão quem tem uma conta válida
    // na rede zeraria o contador a cada acerto e seguiria varrendo as outras contas de graça.
    clearRateLimit(porConta)

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
