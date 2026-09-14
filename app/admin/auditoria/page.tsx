import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import DashboardShell from '../../components/DashboardShell'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'
import { formatDateBR, formatTimeBR, initials, avatarColor } from '@/lib/format'
import type { AuditAction } from '@/lib/audit'

export const metadata = { title: 'Auditoria — NutriMatch' }

const PAGE_SIZE = 50

// Plain-language labels: an audit trail nobody can read is a compliance artefact, not a
// control. "PATIENT_HEALTH_DATA_VIEWED" tells an auditor nothing they can act on.
const ACTION_LABELS: Record<AuditAction, string> = {
  PATIENT_HEALTH_DATA_VIEWED: 'Consultou dados de saúde de um paciente',
  PATIENT_LIST_VIEWED: 'Abriu a lista de pacientes',
  PROFESSIONAL_STATUS_CHANGED: 'Alterou a situação de um profissional',
  PASSWORD_CHANGED: 'Trocou a própria senha',
  PASSWORD_RESET_REQUESTED: 'Pediu redefinição de senha',
  PASSWORD_RESET_COMPLETED: 'Concluiu a redefinição de senha',
  PIX_PAYMENT_CONFIRMED: 'Confirmou o recebimento de um Pix',
  PIX_PAYMENT_REJECTED: 'Recusou um aviso de pagamento Pix',
  PAYOUT_MARKED_PAID: 'Marcou um repasse como pago',
}

const ACTION_TONE: Record<AuditAction, string> = {
  PATIENT_HEALTH_DATA_VIEWED: 'bg-amber-50 text-amber-700 border-amber-100',
  PATIENT_LIST_VIEWED: 'bg-amber-50 text-amber-700 border-amber-100',
  PROFESSIONAL_STATUS_CHANGED: 'bg-blue-50 text-blue-700 border-blue-100',
  PASSWORD_CHANGED: 'bg-gray-50 text-gray-600 border-gray-100',
  PASSWORD_RESET_REQUESTED: 'bg-gray-50 text-gray-600 border-gray-100',
  PASSWORD_RESET_COMPLETED: 'bg-gray-50 text-gray-600 border-gray-100',
  PIX_PAYMENT_CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  PIX_PAYMENT_REJECTED: 'bg-red-50 text-red-600 border-red-100',
  PAYOUT_MARKED_PAID: 'bg-emerald-50 text-emerald-700 border-emerald-100',
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  PROFESSIONAL: 'Profissional',
  PATIENT: 'Paciente',
}

function describeMetadata(action: string, raw: string | null): string | null {
  if (!raw) return null
  try {
    const m = JSON.parse(raw) as Record<string, unknown>
    if (action === 'PROFESSIONAL_STATUS_CHANGED') {
      const base = `${m.professionalName ?? 'profissional'}: ${m.from} → ${m.to}`
      return m.crnVerified ? `${base} · CRN ${m.crn} verificado nesta ação` : base
    }
    if (action === 'PATIENT_LIST_VIEWED') return `${m.patientCount ?? '?'} paciente(s) na lista`
    // Anything else: show the pairs rather than raw JSON, but never invent a phrasing for a
    // shape this page hasn't been taught.
    return Object.entries(m)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(' · ')
  } catch {
    return null
  }
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ acao?: string; pagina?: string }>
}) {
  const admin = await requireRoleOrRedirect('ADMIN')
  const params = await searchParams
  const page = params.pagina ? Math.max(1, Number(params.pagina)) : 1
  const action = params.acao && params.acao in ACTION_LABELS ? params.acao : null

  const where = action ? { action } : {}
  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ])

  // actorId is a User id; resolving names in one extra query beats a join per row.
  const actors = await prisma.user.findMany({
    where: { id: { in: [...new Set(entries.map((e) => e.actorId))] } },
    select: { id: true, name: true, email: true },
  })
  const actorById = new Map(actors.map((a) => [a.id, a]))
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const href = (a: string | null, p = 1) => {
    const qs = new URLSearchParams()
    if (a) qs.set('acao', a)
    if (p > 1) qs.set('pagina', String(p))
    const s = qs.toString()
    return s ? `/admin/auditoria?${s}` : '/admin/auditoria'
  }

  return (
    <DashboardShell sidebar={<AdminSidebar name={admin.name} />}>
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Auditoria</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Quem acessou o quê, e quando — registro exigido pelo art. 37 da LGPD
        </p>
      </div>

      <div className="p-8 space-y-5">
        <div className="flex gap-3 items-start bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4">
          <ShieldCheck size={16} className="text-gray-400 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 leading-relaxed">
            O registro guarda <strong>que houve o acesso</strong>, nunca uma segunda cópia do dado
            acessado. Ele é somente leitura: não há nada nesta tela, nem na API, que apague ou edite
            uma linha — um log que o operador pode reescrever não serve como prova.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={href(null)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              action === null ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Tudo
          </Link>
          {(Object.keys(ACTION_LABELS) as AuditAction[]).map((a) => (
            <Link
              key={a}
              href={href(a)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                action === a ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {ACTION_LABELS[a]}
            </Link>
          ))}
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">
              <span className="font-bold text-gray-900">{total}</span> registro{total !== 1 ? 's' : ''}
              {action && ` · ${ACTION_LABELS[action as AuditAction]}`}
            </p>
          </div>

          {entries.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">Nenhum registro para este filtro.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {entries.map((e) => {
                const actor = actorById.get(e.actorId)
                const detail = describeMetadata(e.action, e.metadata)
                const label = ACTION_LABELS[e.action as AuditAction] ?? e.action
                const tone = ACTION_TONE[e.action as AuditAction] ?? 'bg-gray-50 text-gray-600 border-gray-100'
                return (
                  <li key={e.id} className="px-6 py-4 flex gap-4 items-start">
                    <div
                      className={`w-9 h-9 ${avatarColor(e.actorId)} text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0`}
                    >
                      {initials(actor?.name ?? '??')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">
                          {/* An actor whose account was deleted still has to render — the log
                              outlives the user, which is the point of keeping it. */}
                          {actor?.name ?? 'Usuário removido'}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                          {ROLE_LABELS[e.actorRole] ?? e.actorRole}
                        </span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${tone}`}>{label}</span>
                      </div>
                      {detail && <p className="text-xs text-gray-500 mt-1 break-words">{detail}</p>}
                      {actor?.email && <p className="text-[11px] text-gray-400 mt-0.5">{actor.email}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatDateBR(e.createdAt)}
                      </p>
                      <p className="text-[11px] text-gray-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatTimeBR(e.createdAt)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: Math.min(totalPages, 12) }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={href(action, p)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  p === page ? 'bg-emerald-500 text-white' : 'border border-gray-200 text-gray-600 hover:border-emerald-300'
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
