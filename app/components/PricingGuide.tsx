'use client'

import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { formatPrice } from '@/lib/format'

interface SpecialtyPriceStats {
  specialty: string
  count: number
  min: number
  median: number
  average: number
  max: number
}

/**
 * Mostra, para as especialidades selecionadas, a faixa de preço já praticada por outros
 * profissionais ativos na plataforma — para orientar quem está definindo (ou revendo) o próprio
 * valor. Some silenciosamente sem dados suficientes (especialidade nova, sem ninguém ainda) em
 * vez de mostrar um guia vazio ou enganoso.
 */
export default function PricingGuide({ specialties }: { specialties: string[] }) {
  const [stats, setStats] = useState<SpecialtyPriceStats[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/professionals/pricing-guide')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { guide?: SpecialtyPriceStats[] }) => {
        if (!cancelled) setStats(data.guide ?? [])
      })
      .catch(() => {
        if (!cancelled) setStats([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const relevant = (stats ?? []).filter((s) => specialties.includes(s.specialty) && s.count > 0)
  if (relevant.length === 0) return null

  return (
    <div className="border border-emerald-100 bg-emerald-50/60 rounded-xl p-4 space-y-2">
      <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
        <TrendingUp size={14} /> Guia de preços
      </p>
      <div className="space-y-1.5">
        {relevant.map((s) => (
          <p key={s.specialty} className="text-xs text-emerald-800 leading-relaxed">
            <span className="font-medium">{s.specialty}:</span> hoje varia entre{' '}
            <strong>{formatPrice(s.min)}</strong> e <strong>{formatPrice(s.max)}</strong>, com
            mediana de <strong>{formatPrice(s.median)}</strong>
            {s.count === 1 ? ' — 1 profissional ativo' : ` — ${s.count} profissionais ativos`}.
          </p>
        ))}
      </div>
      <p className="text-[11px] text-emerald-700/80 leading-relaxed pt-1 border-t border-emerald-100">
        Lembre-se:{' '}
        <a href="/como-funciona-profissional" className="underline hover:no-underline">
          a NutriMatch retém uma comissão sobre cada consulta paga pela plataforma
        </a>{' '}
        — considere isso ao definir seu valor.
      </p>
    </div>
  )
}
