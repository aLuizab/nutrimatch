'use client'

import { useState } from 'react'
import { BellOff, Check, Loader2 } from 'lucide-react'

export default function ConfirmarDescadastro({
  userId,
  token,
  firstName,
}: {
  userId: string
  token: string
  firstName: string
}) {
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (done) {
    return (
      <>
        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <Check className="text-emerald-500" size={22} />
        </div>
        <h1 className="text-lg font-bold text-gray-900">Pronto</h1>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          Você não vai mais receber novidades da plataforma. Avisos sobre suas consultas e sua
          conta continuam chegando — esses não dá para desligar, porque são sobre coisas que
          você mesmo fez.
        </p>
      </>
    )
  }

  return (
    <>
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <BellOff className="text-gray-500" size={22} />
      </div>
      <h1 className="text-lg font-bold text-gray-900">Parar de receber novidades?</h1>
      <p className="text-sm text-gray-500 mt-2 leading-relaxed">
        {firstName}, você deixa de receber comunicados sobre a plataforma. Avisos sobre suas
        consultas, pagamentos e sua conta continuam chegando.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mt-4">
          {error}
        </div>
      )}

      <button
        onClick={async () => {
          setSaving(true)
          setError(null)
          try {
            const res = await fetch('/api/descadastrar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, token }),
            })
            if (!res.ok) {
              const data = await res.json().catch(() => ({}) as { error?: string })
              setError(data.error ?? 'Não foi possível concluir. Tente novamente.')
              return
            }
            setDone(true)
          } catch {
            setError('Não foi possível conectar ao servidor. Tente novamente.')
          } finally {
            setSaving(false)
          }
        }}
        disabled={saving}
        className="w-full mt-5 inline-flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-bold px-5 py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60"
      >
        {saving && <Loader2 size={15} className="animate-spin" />}
        Confirmar
      </button>
    </>
  )
}
