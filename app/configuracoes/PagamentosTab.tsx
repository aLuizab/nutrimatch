'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react'
import FeeSimulator from './FeeSimulator'

export interface StripeStatus {
  enabled: boolean
  connected: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  disabledReason: string | null
  requirementsDue: string[]
}

export default function PagamentosTab({
  stripe,
  price,
  feePercent,
}: {
  stripe: StripeStatus
  price: number
  feePercent: number
}) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setRefreshing(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/connect/refresh', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Não foi possível atualizar o status')
        return
      }
      router.refresh()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setRefreshing(false)
    }
  }

  // POST, not a plain link: creating the Stripe account is a mutation and must not be
  // reachable by navigation (see the CSRF note in the onboard route).
  async function connect() {
    setConnecting(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Não foi possível iniciar a conexão com o Stripe')
        return
      }
      window.location.href = data.url
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">Recebimento pela plataforma</h2>
        <p className="text-sm text-gray-500 mb-5">
          Conecte uma conta Stripe para receber os pagamentos das consultas direto na plataforma.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>
        )}

        {!stripe.enabled ? (
          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/60">
            <p className="text-sm text-gray-600">
              O recebimento pela plataforma ainda não está ativo nesta instalação. Por enquanto, o
              pagamento das suas consultas continua sendo combinado diretamente com o paciente.
            </p>
          </div>
        ) : !stripe.connected ? (
          <>
            <div className="border border-gray-100 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-gray-900 mb-2">O que muda ao conectar</p>
              <ul className="text-sm text-gray-600 space-y-1.5 list-disc pl-5">
                <li>O paciente paga no momento do agendamento, pelo site.</li>
                <li>
                  A NutriMatch retém <strong>{feePercent}%</strong> de cada consulta; o restante vai
                  para a sua conta Stripe (descontada a taxa de processamento do próprio Stripe).
                </li>
                <li>Você acompanha repasses e extratos no painel do Stripe.</li>
              </ul>
              <a href="/como-funciona-profissional" target="_blank" className="text-xs text-emerald-600 hover:underline mt-2 inline-block">
                Entenda para que serve a taxa e como isso se relaciona com o ranking de busca →
              </a>
            </div>
            <button
              onClick={connect}
              disabled={connecting}
              className="inline-flex items-center gap-2 bg-emerald-500 text-white text-sm font-bold px-5 py-3 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60"
            >
              {connecting ? 'Abrindo Stripe...' : 'Conectar com Stripe'} <ExternalLink size={15} />
            </button>
            <p className="text-xs text-gray-400 mt-3">
              Você será levado ao Stripe para confirmar seus dados (CPF/CNPJ e documento). Leva
              poucos minutos e pode ser retomado depois.
            </p>
          </>
        ) : (
          <>
            {stripe.chargesEnabled ? (
              <div className="flex items-start gap-3 border border-emerald-100 bg-emerald-50/60 rounded-xl p-4 mb-4">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-emerald-900">Conta conectada e ativa</p>
                  <p className="text-sm text-emerald-800 mt-0.5">
                    Você já pode receber pagamentos pela plataforma.
                    {!stripe.payoutsEnabled && ' Os saques ainda estão sendo liberados pelo Stripe.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 border border-yellow-100 bg-yellow-50 rounded-xl p-4 mb-4">
                <AlertTriangle size={18} className="text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-yellow-900">Conexão incompleta</p>
                  <p className="text-sm text-yellow-800 mt-0.5">
                    {stripe.disabledReason
                      ? 'O Stripe precisa de mais informações antes de liberar os recebimentos.'
                      : 'Faltam dados para o Stripe liberar seus recebimentos.'}{' '}
                    Enquanto isso, suas consultas seguem combinadas diretamente com o paciente.
                  </p>
                </div>
              </div>
            )}

            {stripe.requirementsDue.length > 0 && (
              <div className="border border-gray-100 rounded-xl p-4 mb-4">
                <p className="text-sm font-medium text-gray-900 mb-1">Pendências no Stripe</p>
                <p className="text-sm text-gray-600">
                  Há {stripe.requirementsDue.length} item(ns) pendente(s). Continue o cadastro para
                  não perder o recebimento.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <a
                href="/api/stripe/connect/refresh"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Abrir painel do Stripe <ExternalLink size={14} />
              </a>
              {(!stripe.chargesEnabled || stripe.requirementsDue.length > 0) && (
                <button
                  onClick={connect}
                  disabled={connecting}
                  className="inline-flex items-center gap-2 bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60"
                >
                  {connecting ? 'Abrindo...' : 'Continuar cadastro'} <ExternalLink size={14} />
                </button>
              )}
              <button
                onClick={refresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-60"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Atualizando...' : 'Atualizar status'}
              </button>
            </div>
          </>
        )}
      </div>

      <FeeSimulator defaultPrice={price} feePercent={feePercent} />
    </div>
  )
}
