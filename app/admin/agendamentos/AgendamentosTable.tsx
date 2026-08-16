'use client'

import { useState } from 'react'
import { Search, Video, Users as UsersIcon } from 'lucide-react'

export interface AppointmentRow {
  id: string
  professionalName: string
  patientName: string
  scheduledAtLabel: string
  modality: 'ONLINE' | 'PRESENCIAL' | 'AMBOS'
  price: number
  status: 'CONFIRMED' | 'CANCELLED'
  displayStatus: 'concluido' | 'proximo' | 'pendente' | 'cancelado'
}

const displayStatusLabels: Record<AppointmentRow['displayStatus'], string> = {
  concluido: 'Concluída',
  proximo: 'Em breve',
  pendente: 'Agendada',
  cancelado: 'Cancelada',
}

const displayStatusColors: Record<AppointmentRow['displayStatus'], string> = {
  concluido: 'bg-gray-100 text-gray-500',
  proximo: 'bg-emerald-100 text-emerald-700',
  pendente: 'bg-yellow-50 text-yellow-700',
  cancelado: 'bg-red-50 text-red-600',
}

export default function AgendamentosTable({ appointments }: { appointments: AppointmentRow[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | AppointmentRow['displayStatus']>('todos')

  const filtered = appointments.filter((a) => {
    const matchSearch =
      a.professionalName.toLowerCase().includes(search.toLowerCase()) || a.patientName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || a.displayStatus === statusFilter
    return matchSearch && matchStatus
  })

  const totalRevenue = filtered.filter((a) => a.status === 'CONFIRMED').reduce((sum, a) => sum + a.price, 0)

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por paciente ou profissional..."
            className="w-full border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {(['todos', 'pendente', 'proximo', 'concluido', 'cancelado'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'todos' ? 'Todos' : displayStatusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        <span className="font-bold text-gray-900">{filtered.length}</span> consulta{filtered.length !== 1 ? 's' : ''} ·{' '}
        <span className="font-bold text-gray-900">R$ {totalRevenue}</span> em consultas confirmadas
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Paciente</th>
              <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Profissional</th>
              <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Data</th>
              <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Modalidade</th>
              <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Preço</th>
              <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-5 text-sm font-medium text-gray-900">{a.patientName}</td>
                <td className="py-4 px-4 text-sm text-gray-700">{a.professionalName}</td>
                <td className="py-4 px-4 text-sm text-gray-600 hidden sm:table-cell">{a.scheduledAtLabel}</td>
                <td className="py-4 px-4 hidden md:table-cell">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    {a.modality === 'PRESENCIAL' ? <UsersIcon size={12} /> : <Video size={12} />}
                    {a.modality === 'ONLINE' ? 'Online' : a.modality === 'PRESENCIAL' ? 'Presencial' : 'Online e Presencial'}
                  </span>
                </td>
                <td className="py-4 px-4 text-sm font-bold text-gray-900">R$ {a.price}</td>
                <td className="py-4 px-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${displayStatusColors[a.displayStatus]}`}>
                    {displayStatusLabels[a.displayStatus]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 font-medium">Nenhuma consulta encontrada</p>
          </div>
        )}
      </div>
    </>
  )
}
