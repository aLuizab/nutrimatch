'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'

/**
 * As medidas que este formulário aceita, numa lista só.
 *
 * Declaradas como dados e não como oito pares de `useState` porque a tela precisa saber, de cada
 * uma, a mesma coisa: rótulo, unidade, passo, exemplo e a qual grupo pertence. Com a lista, somar
 * uma medida nova é acrescentar uma linha aqui — e não tocar em quatro lugares e esquecer o quinto.
 */
const MEDIDAS = [
  { campo: 'weightKg', label: 'Peso', unidade: 'kg', step: '0.1', exemplo: '75,5', grupo: 'basico' },
  { campo: 'waistCm', label: 'Cintura', unidade: 'cm', step: '0.5', exemplo: '88', grupo: 'basico' },
  { campo: 'bodyFatPercent', label: 'Gordura', unidade: '%', step: '0.1', exemplo: '24', grupo: 'composicao' },
  { campo: 'leanMassKg', label: 'Massa magra', unidade: 'kg', step: '0.1', exemplo: '52', grupo: 'composicao' },
  { campo: 'hipCm', label: 'Quadril', unidade: 'cm', step: '0.5', exemplo: '100', grupo: 'circunferencias' },
  { campo: 'chestCm', label: 'Tórax', unidade: 'cm', step: '0.5', exemplo: '95', grupo: 'circunferencias' },
  { campo: 'armCm', label: 'Braço', unidade: 'cm', step: '0.5', exemplo: '32', grupo: 'circunferencias' },
  { campo: 'thighCm', label: 'Coxa', unidade: 'cm', step: '0.5', exemplo: '56', grupo: 'circunferencias' },
] as const

type CampoDeMedida = (typeof MEDIDAS)[number]['campo']

const GRUPOS_EXTRA = [
  {
    id: 'composicao' as const,
    titulo: 'Composição corporal',
    ajuda: 'O que separa perder gordura de perder músculo — peso sozinho não distingue os dois.',
  },
  {
    id: 'circunferencias' as const,
    titulo: 'Medidas corporais',
    ajuda: 'Circunferências. Anote só as que você mede; as outras podem ficar vazias.',
  },
]

export interface EntryRow {
  id: string
  dateLabel: string
  weightKg: number | null
  waistCm: number | null
  bodyFatPercent: number | null
  leanMassKg: number | null
  hipCm: number | null
  chestCm: number | null
  armCm: number | null
  thighCm: number | null
  note: string | null
  weightDelta: number | null
}

export default function ProgressForm({ today, entries }: { today: string; entries: EntryRow[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  // Começa fechado: peso e cintura respondem à maioria dos registros, e oito campos abertos de
  // uma vez fazem parecer que todos são obrigatórios — o que é o contrário da regra.
  const [maisMedidas, setMaisMedidas] = useState(false)
  const [recordedAt, setRecordedAt] = useState(today)
  const [valores, setValores] = useState<Record<CampoDeMedida, string>>(
    () => Object.fromEntries(MEDIDAS.map((m) => [m.campo, ''])) as Record<CampoDeMedida, string>
  )
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const setValor = (campo: CampoDeMedida, v: string) => setValores((p) => ({ ...p, [campo]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Só os campos preenchidos vão no corpo. Mandar string vazia como 0 gravaria uma medida que
    // ninguém tomou, e um zero num histórico de saúde é um dado errado, não um campo em branco.
    const preenchidos: Record<string, number> = {}
    for (const m of MEDIDAS) {
      const bruto = valores[m.campo].trim().replace(',', '.')
      if (bruto === '') continue
      const n = Number(bruto)
      if (!Number.isFinite(n)) {
        setError(`${m.label}: valor inválido`)
        return
      }
      preenchidos[m.campo] = n
    }
    if (Object.keys(preenchidos).length === 0) {
      setError('Informe ao menos uma medida')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordedAt, ...preenchidos, note: note || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível salvar a medida')
        return
      }
      setValores(Object.fromEntries(MEDIDAS.map((m) => [m.campo, ''])) as Record<CampoDeMedida, string>)
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
            {MEDIDAS.filter((m) => m.grupo === 'basico').map((m) => (
              <div key={m.campo}>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  {m.label} ({m.unidade})
                </label>
                <input
                  type="number"
                  step={m.step}
                  value={valores[m.campo]}
                  onChange={(e) => setValor(m.campo, e.target.value)}
                  placeholder={m.exemplo}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-surface focus:outline-none focus:border-emerald-500"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setMaisMedidas(!maisMedidas)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:underline"
          >
            {maisMedidas ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {maisMedidas ? 'Menos medidas' : 'Mais medidas (composição corporal, circunferências)'}
          </button>

          {maisMedidas &&
            GRUPOS_EXTRA.map((g) => (
              <div key={g.id} className="border-t border-gray-100 pt-3">
                <p className="text-xs font-bold text-gray-700">{g.titulo}</p>
                <p className="text-xs text-gray-400 mt-0.5 mb-2">{g.ajuda}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {MEDIDAS.filter((m) => m.grupo === g.id).map((m) => (
                    <div key={m.campo}>
                      <label className="text-xs font-medium text-gray-600 block mb-1.5">
                        {m.label} ({m.unidade})
                      </label>
                      <input
                        type="number"
                        step={m.step}
                        value={valores[m.campo]}
                        onChange={(e) => setValor(m.campo, e.target.value)}
                        placeholder={m.exemplo}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-surface focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

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
                <th className="text-left py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Outras</th>
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
                  <td className="py-3 text-sm text-gray-600 hidden lg:table-cell">
                    {/* Só o que foi medido aparece. Uma coluna por circunferência deixaria a
                        tabela com nove colunas quase sempre vazias. */}
                    {outrasMedidas(e).length > 0 ? (
                      <span className="text-xs text-gray-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {outrasMedidas(e).join(' · ')}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
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

/** As medidas além de peso e cintura que esta linha tem, já formatadas. */
function outrasMedidas(e: EntryRow): string[] {
  const partes: string[] = []
  if (e.bodyFatPercent !== null) partes.push(`gordura ${e.bodyFatPercent}%`)
  if (e.leanMassKg !== null) partes.push(`magra ${e.leanMassKg} kg`)
  if (e.hipCm !== null) partes.push(`quadril ${e.hipCm}`)
  if (e.chestCm !== null) partes.push(`tórax ${e.chestCm}`)
  if (e.armCm !== null) partes.push(`braço ${e.armCm}`)
  if (e.thighCm !== null) partes.push(`coxa ${e.thighCm}`)
  return partes
}
