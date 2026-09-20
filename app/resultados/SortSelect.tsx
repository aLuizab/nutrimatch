'use client'

import { useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { buildQueryString, type FilterValues } from './FilterFields'

export default function SortSelect({ initial }: { initial: FilterValues }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function handleChange(ordenar: string) {
    const qs = buildQueryString({ ...initial, ordenar })
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname))
  }

  return (
    <select
      value={initial.ordenar}
      onChange={(e) => handleChange(e.target.value)}
      aria-label="Ordenar resultados"
      className={`border border-gray-200 rounded-xl px-4 py-3 text-sm bg-surface focus:outline-none focus:border-emerald-500 cursor-pointer transition-opacity ${
        isPending ? 'opacity-60' : ''
      }`}
    >
      <option value="relevancia">Mais relevantes</option>
      <option value="avaliacao">Melhor avaliação</option>
      <option value="preco">Menor preço</option>
    </select>
  )
}
