'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Stethoscope, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const router = useRouter()
  const [role, setRole] = useState<'paciente' | 'profissional'>('paciente')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(role === 'profissional' ? '/dashboard' : '/patient/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Painel esquerdo */}
      <div className="hidden lg:flex w-1/2 bg-emerald-500 flex-col justify-between p-12">
        <Link href="/" className="text-2xl font-bold text-white">
          Nutri<span className="text-emerald-200">Match</span>
        </Link>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Cuide da sua saúde com quem entende
          </h2>
          <p className="text-emerald-100 text-lg">
            Acesse sua conta e continue sua jornada rumo à saúde e bem-estar.
          </p>
        </div>
        <p className="text-emerald-200 text-sm">© 2026 NutriMatch</p>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors">
            <ArrowLeft size={16} /> Voltar ao início
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Bem-vindo de volta</h1>
          <p className="text-gray-500 text-sm mb-6">Faça login para acessar sua conta</p>

          {/* Tabs de papel */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setRole('paciente')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                role === 'paciente' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User size={15} /> Sou Paciente
            </button>
            <button
              onClick={() => setRole('profissional')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                role === 'profissional' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Stethoscope size={15} /> Sou Profissional
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">E-mail</label>
              <input
                type="email"
                defaultValue={role === 'profissional' ? 'carolina@nutrimatch.com.br' : 'ana@email.com'}
                placeholder="seu@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  defaultValue="senha123"
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                <input type="checkbox" className="rounded" /> Lembrar de mim
              </label>
              <button type="button" className="text-xs text-emerald-600 font-medium hover:underline">
                Esqueci minha senha
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 transition-colors"
            >
              Entrar
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Não tem conta?{' '}
            <Link href="/cadastro" className="text-emerald-600 font-medium hover:underline">
              Cadastre-se grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
