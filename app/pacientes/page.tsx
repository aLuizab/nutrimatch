'use client'

import React, { useState } from 'react'
import { Search, Filter, ChevronDown, Star, Video, MapPin, MoreVertical } from 'lucide-react'
import ProfessionalSidebar from '../components/ProfessionalSidebar'

const patients = [
  { id: 1, name: 'Ana Silva', initials: 'AS', color: 'bg-blue-500', plan: 'Plano Esportivo', lastVisit: '28/05/2026', nextVisit: '11/06/2026', status: 'ativo', modality: 'online', rating: 5, sessions: 8 },
  { id: 2, name: 'Carlos Mendes', initials: 'CM', color: 'bg-green-500', plan: 'Emagrecimento', lastVisit: '27/05/2026', nextVisit: '10/06/2026', status: 'ativo', modality: 'presencial', rating: 5, sessions: 3 },
  { id: 3, name: 'Juliana Rocha', initials: 'JR', color: 'bg-pink-500', plan: 'Nutrição Funcional', lastVisit: '25/05/2026', nextVisit: '08/06/2026', status: 'ativo', modality: 'online', rating: 4, sessions: 12 },
  { id: 4, name: 'Roberto Lima', initials: 'RL', color: 'bg-orange-500', plan: 'Hipertrofia', lastVisit: '20/05/2026', nextVisit: '05/06/2026', status: 'ativo', modality: 'presencial', rating: 5, sessions: 6 },
  { id: 5, name: 'Beatriz Costa', initials: 'BC', color: 'bg-purple-500', plan: 'Saúde Geral', lastVisit: '15/05/2026', nextVisit: null, status: 'inativo', modality: 'online', rating: 4, sessions: 4 },
  { id: 6, name: 'Marcos Oliveira', initials: 'MO', color: 'bg-teal-500', plan: 'Performance', lastVisit: '10/05/2026', nextVisit: '15/06/2026', status: 'ativo', modality: 'online', rating: 5, sessions: 15 },
  { id: 7, name: 'Fernanda Santos', initials: 'FS', color: 'bg-indigo-500', plan: 'Emagrecimento', lastVisit: '05/05/2026', nextVisit: null, status: 'pausado', modality: 'presencial', rating: 4, sessions: 7 },
  { id: 8, name: 'Diego Alves', initials: 'DA', color: 'bg-yellow-500', plan: 'Nutrição Clínica', lastVisit: '01/05/2026', nextVisit: '06/06/2026', status: 'ativo', modality: 'online', rating: 5, sessions: 20 },
]

const statusColors = {
  ativo: 'bg-emerald-100 text-emerald-700',
  inativo: 'bg-gray-100 text-gray-600',
  pausado: 'bg-yellow-100 text-yellow-700',
}

const statusLabels = { ativo: 'Ativo', inativo: 'Inativo', pausado: 'Pausado' }

export default function Pacientes() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'inativo' | 'pausado'>('todos')
  const [menuOpen, setMenuOpen] = useState<number | null>(null)

  const filtered = patients.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.plan.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <ProfessionalSidebar />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{patients.length} pacientes cadastrados</p>
        </div>

        <div className="p-8">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar paciente ou plano..."
                className="w-full border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {(['todos', 'ativo', 'inativo', 'pausado'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                      statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {s === 'todos' ? 'Todos' : statusLabels[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">Paciente <ChevronDown size={13} /></div>
                  </th>
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Plano</th>
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Última consulta</th>
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Próxima consulta</th>
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Modalidade</th>
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-3.5 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 ${p.color} text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0`}>
                          {p.initials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.sessions} sessões</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 hidden md:table-cell">
                      <span className="text-sm text-gray-700">{p.plan}</span>
                    </td>
                    <td className="py-4 px-4 hidden lg:table-cell">
                      <span className="text-sm text-gray-600">{p.lastVisit}</span>
                    </td>
                    <td className="py-4 px-4 hidden lg:table-cell">
                      <span className={`text-sm ${p.nextVisit ? 'text-gray-600' : 'text-gray-400 italic'}`}>
                        {p.nextVisit ?? 'Sem agendamento'}
                      </span>
                    </td>
                    <td className="py-4 px-4 hidden sm:table-cell">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        {p.modality === 'online' ? <Video size={12} className="text-blue-400" /> : <MapPin size={12} className="text-emerald-400" />}
                        <span className="capitalize">{p.modality}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[p.status as keyof typeof statusColors]}`}>
                        {statusLabels[p.status as keyof typeof statusLabels]}
                      </span>
                    </td>
                    <td className="py-4 px-4 relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical size={16} className="text-gray-400" />
                      </button>
                      {menuOpen === p.id && (
                        <div className="absolute right-4 top-12 bg-white border border-gray-100 rounded-xl shadow-lg z-10 py-1 w-44">
                          <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Ver prontuário</button>
                          <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Agendar consulta</button>
                          <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Enviar mensagem</button>
                          <div className="border-t border-gray-100 my-1" />
                          <button className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">Arquivar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-400 font-medium">Nenhum paciente encontrado</p>
                <button onClick={() => setSearch('')} className="text-emerald-600 text-sm mt-2 hover:underline">
                  Limpar filtro
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
