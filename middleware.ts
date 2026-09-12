import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken, type Role } from '@/lib/jwt'

// This is a UX-level redirect only — it can only verify the JWT's role claim, never the
// DB (Prisma can't run in the edge runtime). It does NOT re-check Professional.status, so a
// just-suspended professional's existing session still passes this until it expires. Real
// authorization happens in lib/session.ts#getCurrentUser(), called by every sensitive Server
// Component/route handler.
// /patient NÃO está aqui de propósito: nutricionista e admin também podem se consultar, então a
// área do paciente é aberta a qualquer sessão válida. Quem manda ali é o perfil de paciente
// existir ou não (lib/session.ts#requirePatientProfileOrRedirect), coisa que o middleware não
// tem como checar — o runtime edge não alcança o banco. As áreas abaixo continuam por papel,
// porque essas sim são espaços de trabalho de um papel só.
const ROLE_PREFIXES: { prefix: string; role: Role }[] = [
  { prefix: '/admin', role: 'ADMIN' },
  { prefix: '/dashboard', role: 'PROFESSIONAL' },
  { prefix: '/agenda', role: 'PROFESSIONAL' },
  { prefix: '/pacientes', role: 'PROFESSIONAL' },
  { prefix: '/programas', role: 'PROFESSIONAL' },
  { prefix: '/configuracoes', role: 'PROFESSIONAL' },
]

const ROLE_HOME: Record<Role, string> = {
  PROFESSIONAL: '/dashboard',
  PATIENT: '/patient/dashboard',
  ADMIN: '/admin/dashboard',
}

/** Exigem apenas uma sessão válida, qualquer papel. */
const AUTH_ONLY_PREFIXES = ['/patient']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const match = ROLE_PREFIXES.find((r) => pathname.startsWith(r.prefix))
  const authOnly = AUTH_ONLY_PREFIXES.some((p) => pathname.startsWith(p))
  if (!match && !authOnly) return NextResponse.next()

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (match && session.role !== match.role) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/patient/:path*',
    '/dashboard/:path*',
    '/agenda/:path*',
    '/pacientes/:path*',
    '/programas/:path*',
    '/configuracoes/:path*',
  ],
}
