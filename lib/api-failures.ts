import { NextResponse } from 'next/server'
import { checkEnv } from './env'

// A route handler that throws answers with an HTML error page, but every form on this site
// reads the reply with res.json(). The parse then throws too, which replaces the real cause
// with a generic "could not connect" — or, where the caller forgot to catch, with nothing at
// all: no redirect, no message, a spinner that just stops. These helpers exist so the auth
// routes always answer JSON and the actual reason lands in the server log instead.

/**
 * Checked before anything is written. signSessionToken() throws when JWT_SECRET is missing or
 * too short, and it runs at the very end of /api/register — so without this guard the account
 * is created, the token then fails, and the person is left with an e-mail address that is
 * taken by an account nobody can sign into. Failing first keeps that from happening.
 */
export function configFailure(): NextResponse | null {
  const env = checkEnv()
  if (env.ok) return null

  console.error('[config] deploy com variáveis de ambiente inválidas:\n' + env.errors.join('\n'))
  return NextResponse.json(
    {
      error:
        'O servidor está com a configuração incompleta e não pode concluir esta ação agora. ' +
        'Se você administra o site, confira as variáveis de ambiente do deploy.',
    },
    { status: 503 }
  )
}

// Prisma's codes for "the database itself is the problem", as opposed to a query being wrong.
// https://www.prisma.io/docs/orm/reference/error-reference
const DATABASE_FAULTS: Record<string, string> = {
  P1000: 'credenciais recusadas',
  P1001: 'servidor inacessível',
  P1002: 'servidor não respondeu a tempo',
  P1008: 'tempo de operação esgotado',
  P1017: 'conexão encerrada pelo servidor',
  P2021: 'tabela ausente — migrations não aplicadas',
}

/**
 * The reason is deliberately only logged, never returned: "migrations não aplicadas" tells an
 * anonymous caller more about the deploy than it tells the person trying to sign in, and the
 * operator has the server log. What the caller gets is an honest category — the database, not
 * their password — so they know retrying is worthwhile and their credentials are not at fault.
 */
export function unexpectedFailure(scope: string, error: unknown): NextResponse {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : null
  const fault = code ? DATABASE_FAULTS[code] : undefined

  console.error(`[${scope}]${code ? ` ${code}` : ''}${fault ? ` (${fault})` : ''}`, error)

  if (fault) {
    return NextResponse.json(
      { error: 'Não foi possível falar com o banco de dados. Tente novamente em instantes.' },
      { status: 503 }
    )
  }
  return NextResponse.json(
    { error: 'Erro inesperado no servidor. Tente novamente em instantes.' },
    { status: 500 }
  )
}
