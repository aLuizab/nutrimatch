'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'

const TAGS = ['Esportiva', 'Emagrecimento', 'Funcional', 'Online']

export default function PatientQuickSearch() {
  const [search, setSearch] = useState('')

  return (
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
        {TAGS.map((tag) => (
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
  )
}
