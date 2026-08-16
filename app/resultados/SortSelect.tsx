'use client'

import { useRouter, usePathname } from 'next/navigation'
import { buildQueryString, type FilterValues } from './FilterFields'

export default function SortSelect({ initial }: { initial: FilterValues }) {
  const router = useRouter()
  const pathname = usePathname()

  function handleChange(ordenar: string) {
    const qs = buildQueryString({ ...initial, ordenar })
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <select
      value={initial.ordenar}
      onChange={(e) => handleChange(e.target.value)}
      className="border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
    >
      <option value="avaliacao">Melhor avaliação</option>
      <option value="preco">Menor preço</option>
    </select>
  )
}
