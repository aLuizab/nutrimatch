'use client'

import React, { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff } from 'lucide-react'

function ResetForm() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('As senhas não coincidem')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível redefinir a senha')
        return
      }
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Link inválido</h1>
        <p className="text-sm text-gray-500 mb-5">Este link não é válido ou está incompleto.</p>
        <Link href="/esqueci-senha" className="text-emerald-600 text-sm font-medium hover:underline">
          Solicitar um novo link
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="text-emerald-500" size={26} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Senha alterada!</h1>
        <p className="text-sm text-gray-500">
          Suas outras sessões foram encerradas por segurança. Redirecionando para o login...
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Criar nova senha</h1>
      <p className="text-gray-500 text-sm mb-6">Escolha uma senha de pelo menos 8 caracteres.</p>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1.5">Nova senha</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-surface"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1.5">Confirmar nova senha</label>
          <input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-surface"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60"
        >
          {loading ? 'Salvando...' : 'Redefinir senha'}
        </button>
      </form>
    </div>
  )
}

export default function RedefinirSenha() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="bg-surface rounded-2xl border border-gray-100 h-64" />}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  )
}
