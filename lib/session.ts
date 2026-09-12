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
  if (!user) return null

  // Session revocation: any token issued before the last password change is dead. This is the
  // only way to kick out a stolen cookie before its 7-day expiry — changing the password logs
  // out every other device.
  if (user.passwordChangedAt && typeof payload.iat === 'number') {
    // JWT iat has second granularity while passwordChangedAt has milliseconds, so a token
    // minted in the same second as the change would otherwise look older than it and be
    // rejected — logging out the very user who just changed their password. Compare against
    // the floored second so same-second tokens survive; any earlier second is still revoked.
    const revokedBefore = Math.floor(user.passwordChangedAt.getTime() / 1000)
    if (payload.iat < revokedBefore) return null
  }

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
  // Suspension has to bite here: middleware can't read the DB from the edge runtime, so
  // without this check an admin suspending a professional did nothing at all until their
  // token expired — up to 7 days of continued access.
  if (role === 'PROFESSIONAL' && user.professional?.status === 'SUSPENDED') {
    throw new AuthError('Sua conta está suspensa. Entre em contato com o suporte.')
  }
  return user
}

export class AuthError extends Error {}

// ── Atendimento como paciente ─────────────────────────────────────────────────────────────
//
// Nutricionista e admin também consultam nutricionista. O schema já previa isso — User tem
// `professional` e `patient`, ambos opcionais — mas o app tratava `role` como se fosse a única
// coisa que a pessoa pode ser, e só quem tinha role PATIENT conseguia agendar.
//
// A saída aqui NÃO é dar múltiplos papéis a alguém: `role` continua sendo o papel principal e é
// ele que decide painel, menu lateral e área de trabalho. O que muda é que qualquer conta pode
// ganhar um **perfil de paciente** e usar a área de paciente com ele. Uma pessoa, dois chapéus.

/**
 * O perfil de paciente da conta, criado na hora se ainda não existir.
 *
 * Criado sob demanda (no primeiro agendamento) e não no cadastro: encher a tabela de Patient
 * com linhas vazias de todo profissional que nunca vai marcar consulta só suja o banco e
 * distorce qualquer contagem de pacientes da plataforma.
 */
export async function ensurePatientProfile(userId: string): Promise<string> {
  const existing = await prisma.patient.findUnique({ where: { userId }, select: { id: true } })
  if (existing) return existing.id
  const created = await prisma.patient.create({ data: { userId }, select: { id: true } })
  return created.id
}

/**
 * Para as telas da área do paciente: exige sessão e um perfil de paciente já existente — não
 * cria nada, porque abrir uma tela não é intenção de virar paciente. Quem ainda não agendou
 * nada vai para a busca, que é onde a jornada começa de verdade.
 */
export async function requirePatientProfileOrRedirect() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!user.patient) redirect('/resultados')
  return user
}

/**
 * Versão para route handlers: age como paciente quem tem perfil de paciente, seja qual for o
 * papel principal. Substitui requireRole('PATIENT') nas ações da área do paciente — o que
 * importa ali é ter o perfil, não ser "só paciente".
 */
export async function requirePatientActor() {
  const user = await requireUser()
  if (!user.patient) throw new AuthError('Você ainda não tem um perfil de paciente')
  return user
}

// For Server Component pages (not route handlers) — redirects instead of throwing, since
// there's no JSON error response to return. Belt-and-suspenders alongside middleware.
export async function requireRoleOrRedirect(role: Role) {
  const user = await getCurrentUser()
  if (!user || user.role !== role) {
    redirect('/login')
  }
  if (role === 'PROFESSIONAL' && user.professional?.status === 'SUSPENDED') {
    redirect('/login?suspenso=1')
  }
  return user
}
