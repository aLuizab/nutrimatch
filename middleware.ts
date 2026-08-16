import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken, type Role } from '@/lib/jwt'

// This is a UX-level redirect only — it can only verify the JWT's role claim, never the
// DB (Prisma can't run in the edge runtime). It does NOT re-check Professional.status, so a
// just-suspended professional's existing session still passes this until it expires. Real
// authorization happens in lib/session.ts#getCurrentUser(), called by every sensitive Server
// Component/route handler.
const ROLE_PREFIXES: { prefix: string; role: Role }[] = [
  { prefix: '/admin', role: 'ADMIN' },
  { prefix: '/patient', role: 'PATIENT' },
  { prefix: '/dashboard', role: 'PROFESSIONAL' },
  { prefix: '/agenda', role: 'PROFESSIONAL' },
  { prefix: '/pacientes', role: 'PROFESSIONAL' },
  { prefix: '/configuracoes', role: 'PROFESSIONAL' },
]

const ROLE_HOME: Record<Role, string> = {
  PROFESSIONAL: '/dashboard',
  PATIENT: '/patient/dashboard',
  ADMIN: '/admin/dashboard',
}

export async function middleware(request: NextRequest) {
  const match = ROLE_PREFIXES.find((r) => request.nextUrl.pathname.startsWith(r.prefix))
  if (!match) return NextResponse.next()

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session.role !== match.role) {
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
    '/configuracoes/:path*',
  ],
}
