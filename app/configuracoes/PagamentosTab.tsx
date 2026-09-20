'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertTriangle, Wallet } from 'lucide-react'
import FeeSimulator from './FeeSimulator'
import { PIX_KEY_TYPES, type PixKeyType } from '@/lib/pix'
import { formatCents } from '@/lib/money'

export interface PixStatus {
  /** A plataforma tem chave configurada? Sem isso ninguém recebe por aqui. */
  platformEnabled: boolean
  pixKey: string | null
  pixKeyType: string | null
  pendingCents: number
  pendingCount: number
  paidCents: number
}

/**
 * Onde o profissional diz para onde quer receber.
 *
 * Bem mais curto do que era com o Stripe Connect, e de propósito: o dinheiro entra na conta da
 * plataforma e sai por transferência, então o profissional não precisa abrir conta em gateway
 * nenhum nem enviar documento — só informar a chave.
 */
export default function PagamentosTab({
  pix,
  price,
  feePercent,
}: {
  pix: PixStatus
  price: number
  feePercent: number
}) {
  const router = useRouter()
  const [pixKey, setPixKey] = useState(pix.pixKey ?? '')
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>((pix.pixKeyType as PixKeyType) ?? 'CPF')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/professional/pix', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pixKey: pixKey.trim(), pixKeyType }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Não foi possível salvar a chave')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const hasKey = Boolean(pix.pixKey)
  const pendingLabel =
    pix.pendingCount === 1 ? '1 consulta' : `${pix.pendingCount} consultas`

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">Como você recebe</h2>
        <p className="text-sm text-gray-500 mb-5">
          O paciente paga por Pix para a NutriMatch, e nós repassamos para a sua chave já
          descontada a taxa de {feePercent}%.
        </p>

        {!pix.platformEnabled ? (
          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/60">
            <p className="text-sm text-gray-600">
              O recebimento pela plataforma ainda não está ativo nesta instalação. Por enquanto, o
              pagamento das suas consultas continua sendo combinado diretamente com o paciente.
            </p>
          </div>
        ) : (
          <>
            {hasKey ? (
              <div className="flex items-start gap-3 border border-emerald-100 bg-emerald-50/60 rounded-xl p-4 mb-5">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-emerald-900">Chave cadastrada</p>
                  <p className="text-sm text-emerald-800 mt-0.5">
                    Você já pode receber pagamentos pela plataforma.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 border border-amber-100 bg-amber-50 rounded-xl p-4 mb-5">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-900">Sem chave Pix cadastrada</p>
                  <p className="text-sm text-amber-800 mt-0.5">
                    Suas consultas continuam sendo cobradas normalmente, mas{' '}
                    <strong>o dinheiro fica retido com a plataforma</strong> até você cadastrar uma
                    chave — não há para onde transferir. Cadastre agora para não acumular.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Tipo de chave</label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value as PixKeyType)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-emerald-500"
                >
                  {PIX_KEY_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Sua chave Pix</label>
                <input
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder={PIX_KEY_TYPES.find((t) => t.id === pixKeyType)?.hint}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Confira com atenção: o repasse vai exatamente para a chave informada aqui.
            </p>

            <button
              onClick={save}
              disabled={saving}
              className="mt-4 bg-emerald-500 text-white text-sm font-bold px-5 py-3 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60"
            >
              {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar chave Pix'}
            </button>
          </>
        )}
      </div>

      {pix.platformEnabled && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Wallet size={17} className="text-emerald-500" /> Seus repasses
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCents(pix.pendingCents)}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                a receber{pix.pendingCount > 0 ? ` · ${pendingLabel}` : ''}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCents(pix.paidCents)}</p>
              <p className="text-xs text-gray-500 mt-0.5">já repassado</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 leading-relaxed">
            Um repasse é aberto quando o pagamento do paciente é confirmado, e sai por Pix para a
            sua chave. O valor já vem com os {feePercent}% da plataforma descontados.
          </p>
        </div>
      )}

      <FeeSimulator defaultPrice={price} feePercent={feePercent} />
    </div>
  )
}
