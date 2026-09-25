import Link from 'next/link'
import { AlertTriangle, FileText, Wallet } from 'lucide-react'
import ProfessionalSidebar from '../components/ProfessionalSidebar'
import DashboardShell from '../components/DashboardShell'
import { requireRoleOrRedirect } from '@/lib/session'
import { formatDateBR, formatTimeBR, modalityLabel } from '@/lib/format'
import { formatCents } from '@/lib/money'
import { platformFeePercent } from '@/lib/fees'
import { PAYOUT_LABELS, listPayoutsFor, payoutTotals, type PayoutPhase } from '@/lib/payouts'

export const metadata = { title: 'Repasses — NutriMatch' }

/**
 * O extrato do profissional: uma linha por consulta, com a etapa em que o dinheiro dela está.
 *
 * Todos os valores exibidos são líquidos — a taxa da plataforma já saiu quando o repasse foi
 * criado (ver splitFee em lib/fees.ts). A tela **não refaz a conta**, de propósito: dois lugares
 * calculando a mesma taxa é como os dois passam a discordar.
 */
export default async function Repasses() {
  const user = await requireRoleOrRedirect('PROFESSIONAL')
  if (!user.professional) return null

  const [totals, payouts] = await Promise.all([
    payoutTotals(user.professional.id),
    listPayoutsFor(user.professional.id),
  ])
  const semChave = !user.professional.pixKey?.trim()
  const feePercent = platformFeePercent()

  const resumo = [
    { label: 'A repassar', value: totals.pendingCents, count: totals.pendingCount },
    { label: 'Em processamento', value: totals.processingCents, count: totals.processingCount },
    { label: 'Já repassado', value: totals.paidCents, count: totals.paidCount },
  ]

  return (
    <DashboardShell sidebar={<ProfessionalSidebar name={user.name} crn={user.professional.crn} />}>
      <div className="bg-surface border-b border-gray-100 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Repasses</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Sua receita por consulta, já com os {feePercent}% da plataforma descontados
        </p>
      </div>

      <div className="p-8 space-y-6">
        {semChave && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">Sem chave Pix cadastrada</p>
              <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                Suas consultas continuam sendo marcadas normalmente, mas não há para onde transferir
                o seu dinheiro — ele fica retido com a plataforma até você cadastrar a chave.{' '}
                <Link href="/configuracoes" className="font-bold underline">
                  Cadastrar agora
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {resumo.map((r) => (
            <div key={r.label} className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-2xl font-bold text-gray-900">{formatCents(r.value)}</p>
              <p className="text-sm text-gray-500 mt-0.5">{r.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {r.count === 1 ? '1 consulta' : `${r.count} consultas`}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Wallet size={16} className="text-emerald-500" /> Como funciona
          </h2>
          <ul className="text-sm text-gray-600 space-y-1.5 leading-relaxed">
            <li>
              <strong>A repassar</strong> — o paciente pagou, a consulta está marcada e a
              transferência para você ainda não saiu.
            </li>
            <li>
              <strong>Em processamento</strong> — a transferência foi feita e o comprovante ainda
              não foi anexado.
            </li>
            <li>
              <strong>Repassado</strong> — transferência feita <em>e</em> comprovante anexado. Um
              repasse só é dado como concluído com o comprovante, que você pode abrir aqui.
            </li>
          </ul>
        </div>

        {payouts.length === 0 ? (
          <p className="text-sm text-gray-400 bg-surface border border-gray-100 rounded-2xl p-10 text-center">
            Nenhum repasse ainda. Eles aparecem aqui quando o pagamento de uma consulta sua é
            confirmado.
          </p>
        ) : (
          <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Consulta
                  </th>
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Paciente
                  </th>
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Situação
                  </th>
                  <th className="text-right py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Você recebe
                  </th>
                  <th className="text-right py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Comprovante
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payouts.map((p) => {
                  const fase = PAYOUT_LABELS[p.status as PayoutPhase]
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-5">
                        {p.appointment ? (
                          <>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDateBR(p.appointment.scheduledAt)} às{' '}
                              {formatTimeBR(p.appointment.scheduledAt)}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {modalityLabel(p.appointment.modality)}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">Consulta removida</p>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 hidden md:table-cell">
                        {p.appointment?.patient.user.name ?? '—'}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${fase.tone}`}
                          title={fase.hint}
                        >
                          {fase.label}
                        </span>
                        {p.paidAt && (
                          <p className="text-xs text-gray-400 mt-1">em {formatDateBR(p.paidAt)}</p>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="text-sm font-bold text-gray-900">{formatCents(p.netCents)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          de {formatCents(p.grossCents)}
                        </p>
                      </td>
                      <td className="py-4 px-5 text-right">
                        {p.receiptFile ? (
                          <a
                            href={`/api/arquivos/${p.receiptFile.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:underline"
                          >
                            <FileText size={13} /> abrir
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
