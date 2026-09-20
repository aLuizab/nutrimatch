'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'

export interface EntryRow {
  id: string
  dateLabel: string
  weightKg: number | null
  waistCm: number | null
  note: string | null
  weightDelta: number | null
}

export default function ProgressForm({ today, entries }: { today: string; entries: EntryRow[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [recordedAt, setRecordedAt] = useState(today)
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!weight && !waist) {
      setError('Informe ao menos o peso ou a cintura')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordedAt,
          weightKg: weight ? Number(weight) : undefined,
          waistCm: waist ? Number(waist) : undefined,
          note: note || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível salvar a medida')
        return
      }
      setWeight('')
      setWaist('')
      setNote('')
      setOpen(false)
      router.refresh()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    setDeletingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/progress/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Não foi possível remover a medida')
        return
      }
      router.refresh()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Minhas medidas</h2>
          <p className="text-xs text-gray-500 mt-0.5">Registrado por você</p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
        >
          <Plus size={15} /> Registrar
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>}

      {open && (
        <form onSubmit={submit} className="border border-gray-100 rounded-xl p-4 mb-5 space-y-3 bg-gray-50/60">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Data</label>
              <input
                type="date"
                value={recordedAt}
                max={today}
                onChange={(e) => setRecordedAt(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-surface focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="75,5"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-surface focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Cintura (cm)</label>
              <input
                type="number"
                step="0.5"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                placeholder="88"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-surface focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">Anotação (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Como foi a semana?"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-surface focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-gray-400 max-w-xs">
              Seus registros ficam visíveis para os nutricionistas com quem você tem consultas.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar medida'}
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">
          Nenhuma medida registrada ainda. Registre seu peso para começar a acompanhar sua evolução.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                <th className="text-left py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Peso</th>
                <th className="text-left py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Cintura</th>
                <th className="text-left py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Anotação</th>
                <th className="py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 text-sm text-gray-700" style={{ fontVariantNumeric: 'tabular-nums' }}>{e.dateLabel}</td>
                  <td className="py-3 text-sm">
                    {e.weightKg !== null ? (
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-gray-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {e.weightKg.toFixed(1)} kg
                        </span>
                        {e.weightDelta !== null && e.weightDelta !== 0 && (
                          <span className={`text-xs font-medium ${e.weightDelta < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {e.weightDelta > 0 ? '+' : ''}{e.weightDelta.toFixed(1)}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-3 text-sm text-gray-600 hidden sm:table-cell" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {e.waistCm !== null ? `${e.waistCm} cm` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 text-sm text-gray-500 hidden md:table-cell max-w-xs truncate">
                    {e.note ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => remove(e.id)}
                      disabled={deletingId === e.id}
                      aria-label={`Remover medida de ${e.dateLabel}`}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
