'use client'

import React, { useState } from 'react'
import { CheckCircle } from 'lucide-react'

export default function SegurancaTab() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (next !== confirm) {
      setError('A confirmação não coincide com a nova senha')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/password/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível alterar a senha')
        return
      }
      setCurrent('')
      setNext('')
      setConfirm('')
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-lg">
      <div>
        <h2 className="text-base font-bold text-gray-900">Alterar senha</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Ao alterar, todas as suas outras sessões são encerradas por segurança.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5">{error}</div>}

      <div>
        <label className="text-xs font-bold text-gray-700 block mb-1.5">Senha atual</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-700 block mb-1.5">Nova senha</label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          minLength={8}
          required
          placeholder="Mínimo 8 caracteres"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-700 block mb-1.5">Confirmar nova senha</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          required
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
          {saved && (<><CheckCircle size={16} /> Senha alterada!</>)}
        </span>
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60"
        >
          {loading ? 'Salvando...' : 'Atualizar senha'}
        </button>
      </div>
    </form>
  )
}
