import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from './prisma'
import { SESSION_COOKIE, verifySessionToken, type Role } from './jwt'

// Middleware only checks the JWT's role claim (it can't reach the DB from the edge
// runtime), so a just-suspended professional's existing session still passes it until
// expiry. getCurrentUser() is the real authorization boundary: every Server Component and
// route handler that reads or writes sensitive data must call this (not trust middleware)
// so status changes (e.g. an admin suspending a professional) take effect immediately.
export async function getCurrentUser() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const payload = await verifySessionToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { professional: true, patient: true },
  })

  return user
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new AuthError('Não autenticado')
  return user
}

export async function requireRole(role: Role) {
  const user = await requireUser()
  if (user.role !== role) throw new AuthError('Acesso não autorizado')
  return user
}

export class AuthError extends Error {}

// For Server Component pages (not route handlers) — redirects instead of throwing, since
// there's no JSON error response to return. Belt-and-suspenders alongside middleware.
export async function requireRoleOrRedirect(role: Role) {
  const user = await getCurrentUser()
  if (!user || user.role !== role) {
    redirect('/login')
  }
  return user
}
