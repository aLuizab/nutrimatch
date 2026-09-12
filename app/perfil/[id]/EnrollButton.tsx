'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

export default function EnrollButton({
  carePlanId,
  planName,
  profileHref,
  isLoggedInPatient,
  alreadyEnrolled,
  paymentRequired,
  totalReais,
  consultations,
  durationMonths,
}: {
  carePlanId: string
  planName: string
  profileHref: string
  isLoggedInPatient: boolean
  alreadyEnrolled: boolean
  paymentRequired: boolean
  totalReais: number
  consultations: number
  durationMonths: number
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (alreadyEnrolled) {
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-xl">
        <CheckCircle2 size={15} /> Você já está neste acompanhamento
      </span>
    )
  }

  if (!isLoggedInPatient) {
    return (
      <a
        href={`/login?next=${encodeURIComponent(profileHref)}`}
        className="bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors whitespace-nowrap"
      >
        Entrar para iniciar
      </a>
    )
  }

  async function enroll() {
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carePlanId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível iniciar o acompanhamento')
        return
      }
      if (data.paymentRequired && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      router.push('/patient/evolucao')
      router.refresh()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (!confirming) {
    return (
      <div>
        <button
          onClick={() => setConfirming(true)}
          className="bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors whitespace-nowrap"
        >
          Iniciar acompanhamento
        </button>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>
    )
  }

  return (
    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 w-full">
      <p className="text-sm font-bold text-emerald-900">Iniciar {planName}?</p>
      {paymentRequired ? (
        <>
          <p className="text-2xl font-bold text-emerald-900 mt-2">
            {totalReais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
            {consultations} consultas em {durationMonths} meses, em uma cobrança só. Depois é só marcar
            os horários pelo app, sem pagar de novo a cada consulta.
          </p>
          {/* Dito antes de cobrar, não escondido nos termos: é a política que faz a compra ser
              justa, e o paciente decide com ela à vista. */}
          <p className="text-xs text-emerald-800 mt-2 leading-relaxed">
            Você pode cancelar nos primeiros 7 dias e receber 100% de volta, sem justificativa.
            Depois disso, se sobrarem consultas ao fim dos {durationMonths} meses, devolvemos o
            valor proporcional das que você não usou.
          </p>
          <a
            href="/politica-de-cancelamento"
            target="_blank"
            className="text-[11px] text-emerald-700 underline hover:text-emerald-900 mt-1 inline-block"
          >
            Veja a política completa de cancelamento e reembolso
          </a>
        </>
      ) : (
        <p className="text-xs text-emerald-800 mt-1.5 leading-relaxed">
          Você poderá agendar as consultas do programa pelo valor combinado. O pagamento é feito
          diretamente com o profissional — a NutriMatch não processa pagamentos deste profissional.
        </p>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setConfirming(false)}
          className="text-sm font-medium text-gray-600 px-4 py-2 rounded-lg hover:bg-white transition-colors"
        >
          Voltar
        </button>
        <button
          onClick={enroll}
          disabled={saving}
          className="bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-60"
        >
          {saving ? 'Abrindo...' : paymentRequired ? 'Ir para o pagamento' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}
