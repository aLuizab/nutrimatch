import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { runReminders } from '@/lib/reminders'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Constant-time comparison. A plain `===` on a secret leaks its length and, byte by byte, its
 * content through response timing — the same reason lib/password.ts doesn't compare hashes
 * directly.
 */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function authorize(request: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : header
  return token.length > 0 && secretMatches(token, expected)
}

async function handle(request: Request) {
  // Without CRON_SECRET this endpoint stays closed rather than open: an unauthenticated route
  // that sends e-mail to every upcoming appointment is a spam cannon pointed at your users.
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 503 })
  }
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const result = await runReminders()
    console.log('[cron:reminders]', JSON.stringify(result))
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[cron:reminders]', e)
    return NextResponse.json({ error: 'Falha ao processar lembretes' }, { status: 500 })
  }
}

// Both verbs: scheduler products differ on which they use, and there is nothing unsafe about
// either here — the work is already idempotent.
export const GET = handle
export const POST = handle
