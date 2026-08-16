'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { buildQueryString, type FilterValues } from './FilterFields'

export default function SearchBar({ initial }: { initial: FilterValues }) {
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState(initial.q)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => setQ(initial.q), [initial.q])

  function commit(value: string) {
    const qs = buildQueryString({ ...initial, q: value })
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function handleChange(value: string) {
    setQ(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => commit(value), 400)
  }

  return (
    <div className="relative flex-1">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      <input
        value={q}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Nome, especialidade ou cidade..."
        className="w-full border border-gray-200 rounded-xl py-3 pl-11 pr-10 text-sm bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
      {q && (
        <button onClick={() => handleChange('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      )}
    </div>
  )
}
