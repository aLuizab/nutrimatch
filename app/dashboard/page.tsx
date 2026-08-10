'use client'

import React from 'react'
import Link from 'next/link'
import { Users, Calendar, TrendingUp, Star, Clock, ChevronRight, Bell, Video, MapPin } from 'lucide-react'
import ProfessionalSidebar from '../components/ProfessionalSidebar'

const stats = [
  { label: 'Pacientes ativos', value: '32', icon: Users, color: 'bg-blue-50 text-blue-600', trend: '+3 esse mês' },
  { label: 'Consultas hoje', value: '4', icon: Calendar, color: 'bg-emerald-50 text-emerald-600', trend: '2 restantes' },
  { label: 'Receita mensal', value: 'R$ 4.800', icon: TrendingUp, color: 'bg-purple-50 text-purple-600', trend: '+12% vs mês anterior' },
  { label: 'Avaliação média', value: '4.9', icon: Star, color: 'bg-yellow-50 text-yellow-600', trend: '47 avaliações' },
]

const todayAppointments = [
  { name: 'Ana Silva', type: 'Retorno', time: '09:00', modality: 'online', status: 'concluido' },
  { name: 'Carlos Mendes', type: 'Primeira consulta', time: '11:00', modality: 'presencial', status: 'concluido' },
  { name: 'Beatriz Costa', type: 'Retorno', time: '14:30', modality: 'online', status: 'proximo' },
  { name: 'Roberto Lima', type: 'Retorno', time: '16:00', modality: 'presencial', status: 'pendente' },
]

const recentPatients = [
  { name: 'Ana Silva', initials: 'AS', color: 'bg-blue-500', specialty: 'Plano esportivo', lastVisit: '28/05/2026' },
  { name: 'Carlos Mendes', initials: 'CM', color: 'bg-green-500', specialty: 'Emagrecimento', lastVisit: '27/05/2026' },
  { name: 'Juliana Rocha', initials: 'JR', color: 'bg-pink-500', specialty: 'Nutrição funcional', lastVisit: '25/05/2026' },
]

export default function DashboardProfissional() {
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <ProfessionalSidebar />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Olá, Carolina! 👋</h1>
            <p className="text-sm text-gray-500 mt-0.5">Quarta-feira, 27 de Maio de 2026</p>
          </div>
          <button className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                    <s.icon size={20} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
                <p className="text-xs text-emerald-600 font-medium mt-2">{s.trend}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agenda do dia */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-base font-bold text-gray-900">Agenda de hoje</h2>
                <Link href="/agenda" className="flex items-center gap-1 text-xs text-emerald-600 font-medium hover:underline">
                  Ver agenda completa <ChevronRight size={14} />
                </Link>
              </div>
              <div className="space-y-3">
                {todayAppointments.map((a) => (
                  <div
                    key={a.name}
                    className={`flex items-center gap-4 p-4 rounded-xl border ${
                      a.status === 'proximo' ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-white'
                    }`}
                  >
                    <div className="text-center w-12 shrink-0">
                      <p className="text-base font-bold text-gray-900">{a.time}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{a.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium ${
                        a.modality === 'online' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {a.modality === 'online' ? <Video size={11} /> : <MapPin size={11} />}
                        {a.modality}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        a.status === 'concluido' ? 'bg-gray-100 text-gray-500' :
                        a.status === 'proximo' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-yellow-50 text-yellow-700'
                      }`}>
                        {a.status === 'concluido' ? 'Concluído' : a.status === 'proximo' ? 'Em breve' : 'Agendado'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Painel lateral direito */}
            <div className="space-y-5">
              {/* Próxima consulta destaque */}
              <div className="bg-emerald-500 rounded-2xl p-5 text-white">
                <p className="text-xs font-bold text-emerald-200 uppercase tracking-widest mb-3">Próxima consulta</p>
                <p className="text-xl font-bold">14:30</p>
                <p className="font-medium mt-0.5">Beatriz Costa</p>
                <p className="text-emerald-200 text-sm mt-0.5">Retorno · Online</p>
                <div className="flex items-center gap-1.5 mt-3 text-emerald-100 text-xs">
                  <Clock size={13} /> Em 1h 30min
                </div>
              </div>

              {/* Pacientes recentes */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-gray-900">Pacientes recentes</h3>
                  <Link href="/pacientes" className="text-xs text-emerald-600 font-medium hover:underline">Ver todos</Link>
                </div>
                <div className="space-y-3">
                  {recentPatients.map((p) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <div className={`w-9 h-9 ${p.color} text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0`}>
                        {p.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.specialty}</p>
                      </div>
                      <p className="text-xs text-gray-400 shrink-0">{p.lastVisit}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
