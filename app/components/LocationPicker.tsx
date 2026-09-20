'use client'

import { useEffect, useState } from 'react'
import { BRAZIL_STATES, formatCityState } from '@/lib/locations'

interface City {
  id: number
  nome: string
}

// Parses the "Cidade, UF" format Patient.city/Professional.city stores back into two parts, so
// editing an existing profile pre-selects both dropdowns instead of starting blank. Older
// free-text values that don't end in ", XX" (typos, missing state) simply fail to parse and
// leave both selects empty — the user just picks again, no migration needed.
function parseCityState(value: string): { uf: string; cityName: string } {
  const match = /^(.*),\s*([A-Za-z]{2})\s*$/.exec(value.trim())
  if (!match) return { uf: '', cityName: '' }
  return { uf: match[2].toUpperCase(), cityName: match[1].trim() }
}

/**
 * Estado → Cidade em cascata, usando a API do IBGE (via app/api/locations/municipios, que faz o
 * proxy) para a lista de cidades. Recebe e emite o mesmo formato "Cidade, UF" que os campos
 * Patient.city / Professional.city sempre guardaram — nenhuma mudança de schema, só uma forma
 * mais confiável de preencher o mesmo campo.
 */
export default function LocationPicker({
  value,
  onChange,
  required = false,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
}) {
  const initial = parseCityState(value)
  const [uf, setUf] = useState(initial.uf)
  const [cityName, setCityName] = useState(initial.cityName)
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Nothing to fetch without a state. handleUfChange clears `cities` directly when the user
    // resets the dropdown to blank — this effect only runs the fetch for a real selection.
    if (!uf) return
    let cancelled = false
    setLoading(true)
    setError(false)
    fetch(`/api/locations/municipios?uf=${uf}`)
      .then((res) => {
        if (!res.ok) throw new Error('request failed')
        return res.json()
      })
      .then((data: { cidades?: City[] }) => {
        if (!cancelled) setCities(data.cidades ?? [])
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [uf])

  function handleUfChange(newUf: string) {
    setUf(newUf)
    setCityName('')
    setCities([])
    // Clears the combined value until a city is picked again — a state alone isn't a valid city.
    onChange('')
  }

  function handleCityChange(newCityName: string) {
    setCityName(newCityName)
    onChange(newCityName ? formatCityState(newCityName, uf) : '')
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs font-bold text-gray-700 block mb-1.5">Estado</label>
        <select
          value={uf}
          onChange={(e) => handleUfChange(e.target.value)}
          required={required}
          disabled={disabled}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-surface disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">Selecione</option>
          {BRAZIL_STATES.map((s) => (
            <option key={s.uf} value={s.uf}>
              {s.nome}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-bold text-gray-700 block mb-1.5">Cidade</label>
        <select
          value={cityName}
          onChange={(e) => handleCityChange(e.target.value)}
          required={required}
          disabled={disabled || !uf || loading}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-surface disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">{loading ? 'Carregando...' : !uf ? 'Selecione o estado primeiro' : 'Selecione'}</option>
          {cities.map((c) => (
            <option key={c.id} value={c.nome}>
              {c.nome}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500 mt-1.5">Não foi possível carregar as cidades. Tente selecionar o estado de novo.</p>}
      </div>
    </div>
  )
}
