import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkEnv } from '@/lib/env'

// Never cached: a cached health check reports the state of a past deploy.
export const dynamic = 'force-dynamic'

/**
 * Answers which half of the deploy is broken — configuration or the database — for the case
 * where every form on the site fails at once and the cause is indistinguishable from outside.
 *
 * Deliberately booleans only. Which variable is missing, or which Prisma code came back, goes
 * to the server log where the operator can read it; an anonymous caller gets enough to know
 * where to look and nothing that maps out the deploy. Also usable as a platform health check.
 */
export async function GET() {
  const env = checkEnv()
  if (!env.ok) console.error('[health] configuração:\n' + env.errors.join('\n'))

  let database = false
  try {
    await prisma.$queryRaw`SELECT 1`
    database = true
  } catch (e) {
    console.error('[health] banco de dados:', e)
  }

  const ok = env.ok && database
  return NextResponse.json(
    { status: ok ? 'ok' : 'degraded', checks: { config: env.ok, database } },
    { status: ok ? 200 : 503 }
  )
}
