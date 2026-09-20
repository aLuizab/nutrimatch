'use client'

import { useState } from 'react'
import { Calculator } from 'lucide-react'
import { formatCents } from '@/lib/money'

/**
 * Shows only what NutriMatch actually retains. A taxa do InfinitePay fica de fora de propósito:
 * NOT estimated here: Brazilian card rates vary by account, instalments and negotiated
 * pricing, so printing a number would be stating a third party's price we can't guarantee —
 * and "quanto eu recebo" is the most trust-sensitive number in the whole product.
 */
export default function FeeSimulator({ defaultPrice, feePercent }: { defaultPrice: number; feePercent: number }) {
  const [price, setPrice] = useState(String(defaultPrice))

  const reais = Number(price)
  const valid = Number.isFinite(reais) && reais > 0
  const totalCents = valid ? Math.round(reais * 100) : 0
  const feeCents = Math.floor((totalCents * feePercent) / 100)
  const netCents = totalCents - feeCents

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-1">
        <Calculator size={17} className="text-emerald-500" /> Simulador de repasse
      </h2>
      <p className="text-sm text-gray-500 mb-5">Veja quanto fica com você em cada consulta.</p>

      <label className="text-xs font-bold text-gray-700 block mb-1.5">Valor da consulta (R$)</label>
      <input
        type="number"
        min={1}
        step={1}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-full max-w-xs border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />

      <div className="mt-5 space-y-2.5 max-w-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Valor da consulta</span>
          <span className="font-medium text-gray-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {valid ? formatCents(totalCents) : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Taxa NutriMatch ({feePercent}%)</span>
          <span className="font-medium text-gray-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {valid ? `− ${formatCents(feeCents)}` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-sm font-bold text-gray-900">Você recebe</span>
          <span className="text-lg font-bold text-emerald-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {valid ? formatCents(netCents) : '—'}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4 max-w-md leading-relaxed">
        O InfinitePay desconta a própria taxa de processamento, que varia conforme a forma de
        pagamento. O que chega na sua chave Pix é o valor acima menos essa taxa — o número exato
        de cada repasse aparece no seu extrato.
      </p>
    </div>
  )
}
