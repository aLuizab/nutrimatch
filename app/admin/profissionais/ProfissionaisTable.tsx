'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Star, MapPin } from 'lucide-react'
import { initials } from '@/lib/format'

export interface ProfessionalRow {
  id: string
  name: string
  specialty: string
  city: string
  price: number
  rating: number
  reviewCount: number
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
  crn: string
}

const statusLabels: Record<ProfessionalRow['status'], string> = {
  PENDING: 'Pendente',
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
}

const statusColors: Record<ProfessionalRow['status'], string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  SUSPENDED: 'bg-red-100 text-red-700',
}

export default function ProfissionaisTable({ professionals }: { professionals: ProfessionalRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | ProfessionalRow['status']>('todos')
  const [pendingId, setPendingId] = useState<string | null>(null)

  const filtered = professionals.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) || p.specialty.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  async function updateStatus(id: string, status: ProfessionalRow['status']) {
    setPendingId(id)
    try {
      await fetch(`/api/admin/professionals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    } finally {
      setPendingId(null)
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar profissional ou especialidade..."
            className="w-full border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['todos', 'PENDING', 'ACTIVE', 'SUSPENDED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
              <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Profissional</th>
              <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Cidade</th>
              <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Preço</th>
              <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Avaliação</th>
              <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="py-3.5 px-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {initials(p.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.specialty}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 hidden md:table-cell">
                  <span className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin size={12} className="text-gray-400" /> {p.city || '—'}
                  </span>
                </td>
                <td className="py-4 px-4 hidden sm:table-cell">
                  <span className="text-sm text-gray-700">R$ {p.price}</span>
                </td>
                <td className="py-4 px-4 hidden sm:table-cell">
                  <span className="flex items-center gap-1 text-sm text-gray-600">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" /> {p.rating.toFixed(1)}{' '}
                    <span className="text-xs text-gray-400">({p.reviewCount})</span>
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[p.status]}`}>
                    {statusLabels[p.status]}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2 justify-end">
                    {p.status !== 'ACTIVE' && (
                      <button
                        disabled={pendingId === p.id}
                        onClick={() => updateStatus(p.id, 'ACTIVE')}
                        className="text-xs font-medium text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
                      >
                        {p.status === 'PENDING' ? 'Aprovar' : 'Reativar'}
                      </button>
                    )}
                    {p.status !== 'SUSPENDED' && (
                      <button
                        disabled={pendingId === p.id}
                        onClick={() => updateStatus(p.id, 'SUSPENDED')}
                        className="text-xs font-medium text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        Suspender
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 font-medium">Nenhum profissional encontrado</p>
          </div>
        )}
      </div>
    </>
  )
}
