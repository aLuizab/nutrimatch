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
}: {
  carePlanId: string
  planName: string
  profileHref: string
  isLoggedInPatient: boolean
  alreadyEnrolled: boolean
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
      <p className="text-xs text-emerald-800 mt-1.5 leading-relaxed">
        Você poderá agendar as consultas do programa pelo valor combinado. O pagamento é feito
        diretamente com o profissional — a NutriMatch não processa pagamentos.
      </p>
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
          {saving ? 'Iniciando...' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}
