'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Search, Calendar, Star, Video, MapPin, Clock, ChevronRight, Bell } from 'lucide-react'
import PatientSidebar from '../../components/PatientSidebar'

const upcoming = {
  doctor: 'Dra. Carolina Matos',
  specialty: 'Nutrição Esportiva',
  date: 'Qua, 04/06/2026',
  time: '14:30',
  modality: 'online',
  initials: 'CM',
}

const suggestions = [
  { name: 'Dr. Rafael Costa', specialty: 'Nutrição Clínica', rating: 4.8, price: 120, initials: 'RC', color: 'bg-blue-500' },
  { name: 'Dra. Maria Fernanda', specialty: 'Nutrição Funcional', rating: 5.0, price: 180, initials: 'MF', color: 'bg-purple-500' },
  { name: 'Dra. Juliana Torres', specialty: 'Nutrição Infantil', rating: 4.7, price: 130, initials: 'JT', color: 'bg-pink-500' },
]

const recentHistory = [
  { doctor: 'Dra. Carolina Matos', date: '14/05/2026', type: 'Retorno', initials: 'CM', color: 'bg-emerald-500' },
  { doctor: 'Dra. Carolina Matos', date: '24/04/2026', type: 'Primeira consulta', initials: 'CM', color: 'bg-emerald-500' },
]

export default function PatientDashboard() {
  const [search, setSearch] = useState('')

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <PatientSidebar />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Olá, Ana! 👋</h1>
            <p className="text-sm text-gray-500 mt-0.5">Quarta-feira, 27 de Maio de 2026</p>
          </div>
          <button className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Próxima consulta */}
          <div className="bg-emerald-500 rounded-2xl p-6 text-white">
            <p className="text-xs font-bold text-emerald-200 uppercase tracking-widest mb-4">Próxima consulta</p>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 text-white rounded-full flex items-center justify-center text-lg font-bold">
                  {upcoming.initials}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{upcoming.doctor}</h3>
                  <p className="text-emerald-200 text-sm">{upcoming.specialty}</p>
                  <div className="flex items-center gap-4 mt-1.5 text-emerald-100 text-sm">
                    <span className="flex items-center gap-1.5"><Calendar size={13} /> {upcoming.date}</span>
                    <span className="flex items-center gap-1.5"><Clock size={13} /> {upcoming.time}</span>
                    <span className="flex items-center gap-1.5">
                      {upcoming.modality === 'online' ? <Video size={13} /> : <MapPin size={13} />}
                      {upcoming.modality === 'online' ? 'Online' : 'Presencial'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
                  Reagendar
                </button>
                <button className="bg-white text-emerald-600 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors">
                  Entrar na consulta
                </button>
              </div>
            </div>
          </div>

          {/* Busca rápida */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Encontrar nutricionista</h2>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Busque por especialidade ou nome..."
                  className="w-full border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <Link
                href={`/resultados${search ? `?q=${encodeURIComponent(search)}` : ''}`}
                className="bg-emerald-500 text-white text-sm font-bold px-5 py-3 rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-2"
              >
                <Search size={16} /> Buscar
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {['Esportiva', 'Emagrecimento', 'Funcional', 'Online'].map((tag) => (
                <Link
                  key={tag}
                  href={`/resultados?q=${tag}`}
                  className="text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-full hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sugestões */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-base font-bold text-gray-900">Recomendados para você</h2>
                <Link href="/resultados" className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1">
                  Ver todos <ChevronRight size={13} />
                </Link>
              </div>
              <div className="space-y-4">
                {suggestions.map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${s.color} text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0`}>
                      {s.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-500">{s.specialty}</p>
                        <span className="flex items-center gap-0.5 text-xs text-gray-500">
                          <Star size={11} className="text-yellow-400 fill-yellow-400" /> {s.rating}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">R$ {s.price}</p>
                      <Link href="/perfil" className="text-xs text-emerald-600 hover:underline">Ver perfil</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Histórico recente */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-base font-bold text-gray-900">Histórico recente</h2>
                <Link href="/patient/consultas" className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1">
                  Ver todas <ChevronRight size={13} />
                </Link>
              </div>
              <div className="space-y-4">
                {recentHistory.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className={`w-10 h-10 ${h.color} text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0`}>
                      {h.initials}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{h.doctor}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{h.type} · {h.date}</p>
                    </div>
                    <button className="text-xs text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors font-medium">
                      Reagendar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
