import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { appUrlProblem, checkEnv } from '@/lib/env'

// Never cached: a cached health check reports the state of a past deploy.
export const dynamic = 'force-dynamic'

/**
 * Answers which part of the deploy is broken, for the case where every form on the site fails
 * at once and the cause is indistinguishable from outside.
 *
 * Deliberately booleans only. Which variable is missing, or which Prisma code came back, goes
 * to the server log where the operator can read it; an anonymous caller gets enough to know
 * where to look and nothing that maps out the deploy.
 *
 * The HTTP status follows config and database alone, because those are what stop the app from
 * serving — a platform health check reading this should not restart a container that is working
 * just because links in outgoing e-mail point at the wrong host. appUrl still shows up in the
 * body and turns the status to "degraded", so the problem is visible rather than silent.
 */
export async function GET() {
  const env = checkEnv()
  if (!env.ok) console.error('[health] configuração:\n' + env.errors.join('\n'))

  const urlProblem = appUrlProblem()
  if (urlProblem) console.warn('[health] ' + urlProblem)

  let database = false
  try {
    await prisma.$queryRaw`SELECT 1`
    database = true
  } catch (e) {
    console.error('[health] banco de dados:', e)
  }

  const serving = env.ok && database
  return NextResponse.json(
    {
      status: serving && !urlProblem ? 'ok' : 'degraded',
      checks: { config: env.ok, database, appUrl: !urlProblem },
    },
    { status: serving ? 200 : 503 }
  )
}
