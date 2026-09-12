import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { settleExpiredEnrollments } from '@/lib/settlement'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Separate from /api/cron/reminders on purpose. This one moves money — it issues refunds — and
// deserves its own schedule (daily is plenty) and its own line in the logs. Folding refunds
// into a route called "reminders" would hide that fact from whoever reads the cron config.

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
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 503 })
  }
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const result = await settleExpiredEnrollments()
    console.log('[cron:settlements]', JSON.stringify(result))
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[cron:settlements]', e)
    return NextResponse.json({ error: 'Falha ao acertar os pacotes' }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
