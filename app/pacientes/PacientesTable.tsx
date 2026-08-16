'use client'

import { useState } from 'react'
import { Search, Video, MapPin } from 'lucide-react'
import { initials, avatarColor } from '@/lib/format'

export interface PatientRow {
  id: string
  name: string
  lastReason: string | null
  lastVisitLabel: string | null
  nextVisitLabel: string | null
  modality: 'ONLINE' | 'PRESENCIAL'
  sessions: number
  status: 'ativo' | 'inativo'
}

const statusColors: Record<PatientRow['status'], string> = {
  ativo: 'bg-emerald-100 text-emerald-700',
  inativo: 'bg-gray-100 text-gray-600',
}
const statusLabels: Record<PatientRow['status'], string> = { ativo: 'Ativo', inativo: 'Inativo' }

export default function PacientesTable({ patients }: { patients: PatientRow[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | PatientRow['status']>('todos')

  const filtered = patients.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.lastReason ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente..."
            className="w-full border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['todos', 'ativo', 'inativo'] as const).map((s) => (
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Paciente</th>
              <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Última consulta</th>
              <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Próxima consulta</th>
              <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Modalidade</th>
              <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 ${avatarColor(p.id)} text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0`}>
                      {initials(p.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.sessions} sessões</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 hidden lg:table-cell">
                  <span className="text-sm text-gray-600">{p.lastVisitLabel ?? '—'}</span>
                </td>
                <td className="py-4 px-4 hidden lg:table-cell">
                  <span className={`text-sm ${p.nextVisitLabel ? 'text-gray-600' : 'text-gray-400 italic'}`}>
                    {p.nextVisitLabel ?? 'Sem agendamento'}
                  </span>
                </td>
                <td className="py-4 px-4 hidden sm:table-cell">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    {p.modality === 'ONLINE' ? <Video size={12} className="text-blue-400" /> : <MapPin size={12} className="text-emerald-400" />}
                    <span className="capitalize">{p.modality === 'ONLINE' ? 'Online' : 'Presencial'}</span>
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[p.status]}`}>{statusLabels[p.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 font-medium">Nenhum paciente encontrado</p>
          </div>
        )}
      </div>
    </>
  )
}
