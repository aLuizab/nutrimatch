'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'

export default function HeroSearch() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="flex gap-3 max-w-xl mx-auto">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (window.location.href = `/resultados?q=${encodeURIComponent(searchQuery)}`)}
          placeholder="Nome, especialidade ou cidade..."
          className="w-full border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-gray-700 shadow-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
        />
      </div>
      <Link
        href={`/resultados${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`}
        className="bg-emerald-500 text-white px-6 py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
      >
        <Search size={18} />
        <span className="hidden sm:inline">Buscar</span>
      </Link>
    </div>
  )
}
