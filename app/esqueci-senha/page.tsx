'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MailCheck } from 'lucide-react'

export default function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.status === 429) {
        setError('Muitas solicitações. Tente novamente mais tarde.')
        return
      }
      // Always the same outcome, whether or not the address exists — the API deliberately
      // does not reveal it, and the UI must not either.
      setSent(true)
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors">
          <ArrowLeft size={16} /> Voltar ao login
        </Link>

        {sent ? (
          <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MailCheck className="text-emerald-500" size={26} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verifique seu e-mail</h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Se existir uma conta com <strong className="text-gray-700">{email}</strong>, enviamos
              um link para redefinir a senha. Ele vale por 30 minutos.
            </p>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Esqueceu a senha?</h1>
            <p className="text-gray-500 text-sm mb-6">
              Informe seu e-mail e enviaremos um link para criar uma nova.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-surface"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60"
              >
                {loading ? 'Enviando...' : 'Enviar link'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
