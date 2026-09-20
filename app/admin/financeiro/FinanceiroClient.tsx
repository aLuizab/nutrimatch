'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, AlertTriangle } from 'lucide-react'
import { formatCents } from '@/lib/money'

export interface PendingCharge {
  kind: 'consulta' | 'pacote'
  id: string
  patientName: string
  professionalName: string
  description: string
  amountCents: number
  txid: string | null
  claimedAtLabel: string
  note: string | null
  /** O paciente clicou em "já paguei". Falso quando ele pagou e não voltou — ou não pagou. */
  declared: boolean
  /** Até quando o horário fica preso sem confirmação. Null em pacote, que não prende agenda. */
  deadlineLabel: string | null
}

export interface PendingPayout {
  id: string
  professionalName: string
  description: string
  grossCents: number
  feeCents: number
  netCents: number
  pixKey: string | null
  pixKeyType: string | null
  createdAtLabel: string
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          /* clipboard bloqueado: o valor continua visível ao lado para copiar à mão */
        }
      }}
      title={`Copiar ${label}`}
      className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'copiado' : 'copiar'}
    </button>
  )
}

/**
 * As duas filas que fazem o dinheiro andar, lado a lado: o que entrou (conferir) e o que sai
 * (repassar). Ficam juntas porque são o mesmo trabalho, feito na mesma sessão, olhando o mesmo
 * extrato — separá-las em telas distintas só faria ir e voltar.
 */
export default function FinanceiroClient({
  charges,
  payouts,
}: {
  charges: PendingCharge[]
  payouts: PendingPayout[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reviewCharge(c: PendingCharge, action: 'CONFIRM' | 'REJECT') {
    setBusy(`${c.kind}:${c.id}`)
    setError(null)
    try {
      const res = await fetch(`/api/admin/pagamentos/${c.kind}/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Não foi possível registrar a conferência')
        return
      }
      router.refresh()
    } catch {
      setError('Não foi possível conectar ao servidor.')
    } finally {
      setBusy(null)
    }
  }

  async function markPaid(p: PendingPayout) {
    setBusy(`payout:${p.id}`)
    setError(null)
    try {
      const res = await fetch(`/api/admin/repasses/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_PAID' }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Não foi possível marcar como pago')
        return
      }
      router.refresh()
    } catch {
      setError('Não foi possível conectar ao servidor.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      <section>
        <h2 className="text-base font-bold text-gray-900 mb-1">
          Pagamentos a conferir <span className="text-gray-400 font-normal">({charges.length})</span>
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          O paciente avisou que pagou. Confira a entrada no extrato pelo valor e pelo
          identificador antes de confirmar — confirmar sem conferir é liberar consulta sem
          dinheiro.
        </p>

        {charges.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white border border-gray-100 rounded-2xl p-6 text-center">
            Nada a conferir agora.
          </p>
        ) : (
          <div className="space-y-3">
            {charges.map((c) => (
              <div key={`${c.kind}-${c.id}`} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">
                        {c.kind}
                      </span>
                      <p className="font-bold text-gray-900">{c.patientName}</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{c.description}</p>
                    <p className="text-sm text-gray-500">Profissional: {c.professionalName}</p>
                    {c.declared ? (
                      <p className="text-xs text-gray-400 mt-2">Avisou em {c.claimedAtLabel}</p>
                    ) : (
                      /* Sem declaração, o extrato do InfinitePay é a única fonte — e o admin
                         precisa saber que é ele quem tem de ir olhar, em vez de esperar. */
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2 leading-relaxed">
                        O paciente não avisou que pagou. Confira no extrato do InfinitePay antes
                        de confirmar.
                        {c.deadlineLabel && ` O horário fica preso até ${c.deadlineLabel}.`}
                      </p>
                    )}
                    {c.note && (
                      <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mt-2">
                        Observação do paciente: {c.note}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-gray-900">{formatCents(c.amountCents)}</p>
                    {c.txid && (
                      <p className="text-xs text-gray-400 mt-1 font-mono flex items-center gap-2 justify-end">
                        {c.txid} <CopyButton value={c.txid} label="identificador" />
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => reviewCharge(c, 'CONFIRM')}
                    disabled={busy !== null}
                    className="bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    {busy === `${c.kind}:${c.id}` ? 'Registrando...' : 'Confirmar recebimento'}
                  </button>
                  <button
                    onClick={() => reviewCharge(c, 'REJECT')}
                    disabled={busy !== null}
                    className="text-sm font-medium text-red-500 border border-red-100 px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Não encontrei
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-900 mb-1">
          Repasses a pagar <span className="text-gray-400 font-normal">({payouts.length})</span>
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Faça o Pix para a chave do profissional e marque aqui. O valor já está com a taxa da
          plataforma descontada.
        </p>

        {payouts.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white border border-gray-100 rounded-2xl p-6 text-center">
            Nenhum repasse pendente.
          </p>
        ) : (
          <div className="space-y-3">
            {payouts.map((p) => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900">{p.professionalName}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{p.description}</p>
                    <p className="text-xs text-gray-400 mt-2">Aberto em {p.createdAtLabel}</p>
                    {p.pixKey ? (
                      <p className="text-sm text-gray-700 mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase text-gray-400">{p.pixKeyType}</span>
                        <span className="font-mono">{p.pixKey}</span>
                        <CopyButton value={p.pixKey} label="chave Pix" />
                      </p>
                    ) : (
                      <p className="flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
                        <AlertTriangle size={14} /> Sem chave Pix cadastrada — peça ao profissional
                        antes de repassar.
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-gray-900">{formatCents(p.netCents)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      de {formatCents(p.grossCents)} · taxa {formatCents(p.feeCents)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => markPaid(p)}
                  disabled={busy !== null || !p.pixKey}
                  className="mt-4 bg-gray-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
                >
                  {busy === `payout:${p.id}` ? 'Registrando...' : 'Marcar como pago'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
