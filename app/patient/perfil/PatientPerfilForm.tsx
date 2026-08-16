'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { initials } from '@/lib/format'

const GOALS = ['Emagrecimento', 'Ganho de massa muscular', 'Melhora da saúde geral', 'Controle de doenças', 'Nutrição esportiva']

export interface PatientProfileData {
  name: string
  email: string
  phone: string
  birthDate: string
  goal: string
  city: string
}

export default function PatientPerfilForm({ initialProfile }: { initialProfile: PatientProfileData }) {
  const router = useRouter()
  const [name, setName] = useState(initialProfile.name)
  const [phone, setPhone] = useState(initialProfile.phone)
  const [birthDate, setBirthDate] = useState(initialProfile.birthDate)
  const [goal, setGoal] = useState(initialProfile.goal || GOALS[0])
  const [city, setCity] = useState(initialProfile.city)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/patient/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, birthDate, goal, city }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível salvar')
        return
      }
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-5">Informações pessoais</h2>

        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 bg-blue-500 text-white rounded-full flex items-center justify-center text-2xl font-bold">
            {initials(name)}
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">Nome completo</label>
            <input value={name} onChange={(e) => setName(e.target.value)} type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">E-mail</label>
            <input value={initialProfile.email} disabled type="email" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">Telefone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">Data de nascimento</label>
            <input value={birthDate} onChange={(e) => setBirthDate(e.target.value)} type="date" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">Cidade</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} type="text" placeholder="São Paulo, SP" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">Objetivo principal</label>
            <select value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 bg-white">
              {GOALS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
          {saved && <><CheckCircle size={16} /> Salvo com sucesso!</>}
        </div>
        <button type="submit" disabled={loading} className="bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60">
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}
