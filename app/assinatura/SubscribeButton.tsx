'use client'

import { useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'

/**
 * One button, two endpoints: subscribing and managing an existing subscription are the same
 * interaction (leave the app, come back), so they share the loading and error handling instead
 * of being two nearly-identical components.
 */
export default function SubscribeButton({
  action,
  label,
  variant = 'primary',
}: {
  action: 'checkout' | 'portal'
  label: string
  variant?: 'primary' | 'secondary'
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/stripe/subscription/${action}`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Não foi possível continuar. Tente novamente.')
        setBusy(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        onClick={go}
        disabled={busy}
        className={
          variant === 'primary'
            ? 'inline-flex items-center gap-2 bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60'
            : 'inline-flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60'
        }
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
        {busy ? 'Abrindo...' : label}
      </button>
      {error && <p className="text-xs text-red-600 mt-2 max-w-sm">{error}</p>}
    </div>
  )
}
