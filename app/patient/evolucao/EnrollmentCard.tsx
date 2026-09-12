'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDateBR, formatPrice } from '@/lib/format'

export interface EnrollmentSummary {
  id: string
  planName: string
  professionalId: string
  professionalName: string
  used: number
  total: number
  remaining: number
  endsAt: Date
  pricePerConsultation: number
  listPriceAtEnrollment: number
  withinWithdrawalWindow: boolean
  paidAmountLabel: string | null
}

export default function EnrollmentCard({ program }: { program: EnrollmentSummary }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ refunded: boolean; refundedLabel: string | null } | null>(null)

  async function cancel() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/enrollments/${program.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível cancelar')
        return
      }
      setDone(data)
      router.refresh()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="bg-emerald-500 rounded-2xl p-6 text-white">
        <p className="font-bold">Acompanhamento cancelado</p>
        <p className="text-emerald-100 text-sm mt-1">
          {done.refunded
            ? `${done.refundedLabel} serão devolvidos ao seu método de pagamento em alguns minutos.`
            : 'O cancelamento foi confirmado.'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-emerald-500 rounded-2xl p-6 text-white">
      <p className="text-xs font-bold text-emerald-200 uppercase tracking-widest mb-3">Acompanhamento ativo</p>
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h2 className="text-lg font-bold">{program.planName}</h2>
          <p className="text-emerald-100 text-sm mt-0.5">com {program.professionalName}</p>
          <p className="text-emerald-100 text-sm mt-2">
            {formatPrice(program.pricePerConsultation)} por consulta · até {formatDateBR(program.endsAt)}
          </p>
        </div>
        <div className="min-w-[180px]">
          <div className="flex justify-between text-sm text-emerald-100 mb-1.5">
            <span>
              {program.used} de {program.total} consultas
            </span>
            <span>{program.remaining} restantes</span>
          </div>
          <div className="h-2 bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{ width: `${Math.min(100, (program.used / program.total) * 100)}%` }}
            />
          </div>
          {program.remaining > 0 && (
            <Link
              href={`/agendamento/${program.professionalId}`}
              className="inline-block mt-3 bg-white text-emerald-600 text-sm font-bold px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors"
            >
              Agendar próxima
            </Link>
          )}
        </div>
      </div>

      {program.withinWithdrawalWindow && (
        <div className="mt-4 pt-4 border-t border-white/20">
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="text-xs font-medium text-white/90 underline hover:text-white"
            >
              Cancelar e receber reembolso total
            </button>
          ) : (
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-white leading-relaxed">
                Você está dentro do prazo de 7 dias para desistir da compra sem precisar de
                justificativa (direito de arrependimento garantido pelo CDC). Ao confirmar,{' '}
                {program.paidAmountLabel ?? 'o valor pago'} será devolvido integralmente e o
                acompanhamento será encerrado.
              </p>
              {error && <p className="text-xs text-red-100 mt-2">{error}</p>}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setConfirming(false)}
                  className="text-xs font-medium text-white/80 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={cancel}
                  disabled={loading}
                  className="text-xs font-bold text-emerald-700 bg-white px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-60"
                >
                  {loading ? 'Cancelando...' : 'Confirmar cancelamento'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
