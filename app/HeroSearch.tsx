'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'

export default function HeroSearch() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const href = searchQuery ? `/resultados?q=${encodeURIComponent(searchQuery)}` : '/resultados'
    startTransition(() => router.push(href))
  }

  return (
    <form onSubmit={submit} className="flex gap-3 max-w-xl mx-auto">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Nome, especialidade ou cidade..."
          aria-label="Buscar nutricionista"
          className="w-full border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-gray-700 shadow-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all bg-surface"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="bg-emerald-500 text-white px-6 py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap disabled:opacity-70"
      >
        {isPending ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
        <span className="hidden sm:inline">Buscar</span>
      </button>
    </form>
  )
}
