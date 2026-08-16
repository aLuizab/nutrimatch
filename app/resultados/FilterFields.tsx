'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const SPECIALTIES = ['Todas', 'Esportiva', 'Clínica', 'Funcional', 'Infantil', 'Vegana', 'Oncológica']
const MODALITIES = ['Todas', 'Online', 'Presencial']
const MIN_RATINGS = [
  { value: 0, label: 'Qualquer avaliação' },
  { value: 4, label: '4.0+' },
  { value: 4.5, label: '4.5+' },
  { value: 4.8, label: '4.8+' },
]

export interface FilterValues {
  q: string
  especialidade: string
  modalidade: string
  precoMax: number
  avaliacaoMin: number
  ordenar: string
}

export function buildQueryString(values: FilterValues) {
  const params = new URLSearchParams()
  if (values.q) params.set('q', values.q)
  if (values.especialidade && values.especialidade !== 'Todas') params.set('especialidade', values.especialidade)
  if (values.modalidade && values.modalidade !== 'Todas') params.set('modalidade', values.modalidade)
  if (values.precoMax && values.precoMax !== 250) params.set('precoMax', String(values.precoMax))
  if (values.avaliacaoMin) params.set('avaliacaoMin', String(values.avaliacaoMin))
  if (values.ordenar && values.ordenar !== 'avaliacao') params.set('ordenar', values.ordenar)
  return params.toString()
}

export default function FilterFields({ initial, onNavigate }: { initial: FilterValues; onNavigate?: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const [displayPrice, setDisplayPrice] = useState(initial.precoMax)

  useEffect(() => setDisplayPrice(initial.precoMax), [initial.precoMax])

  function navigate(overrides: Partial<FilterValues>) {
    const values: FilterValues = { ...initial, ...overrides }
    const qs = buildQueryString(values)
    router.push(qs ? `${pathname}?${qs}` : pathname)
    onNavigate?.()
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Especialidade</h3>
        <div className="space-y-0.5">
          {SPECIALTIES.map((s) => (
            <button
              key={s}
              onClick={() => navigate({ especialidade: s })}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                initial.especialidade === s ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Modalidade</h3>
        <div className="space-y-0.5">
          {MODALITIES.map((m) => (
            <button
              key={m}
              onClick={() => navigate({ modalidade: m })}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                initial.modalidade === m ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Avaliação mínima</h3>
        <div className="space-y-0.5">
          {MIN_RATINGS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => navigate({ avaliacaoMin: value })}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                initial.avaliacaoMin === value ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
          Preço máximo: <span className="text-emerald-600 normal-case font-bold">R$ {displayPrice}</span>
        </h3>
        <input
          type="range"
          min={50}
          max={250}
          value={displayPrice}
          onChange={(e) => setDisplayPrice(Number(e.target.value))}
          onMouseUp={(e) => navigate({ precoMax: Number(e.currentTarget.value) })}
          onTouchEnd={(e) => navigate({ precoMax: Number(e.currentTarget.value) })}
          onKeyUp={(e) => navigate({ precoMax: Number(e.currentTarget.value) })}
          className="w-full accent-emerald-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>R$ 50</span>
          <span>R$ 250</span>
        </div>
      </div>
    </div>
  )
}
