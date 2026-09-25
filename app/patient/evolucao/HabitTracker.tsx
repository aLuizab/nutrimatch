'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, Check, Flame, Plus } from 'lucide-react'
import type { HabitView } from '@/lib/habits'

const DIA_CURTO = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

/**
 * A faixa de hábitos: uma linha por hábito, sete quadrados por linha.
 *
 * Sete dias e não um mês porque é assim que se pensa hábito — "esta semana eu fui" —, e porque
 * trinta quadrados por linha num celular deixam de ser clicáveis. A sequência (o número ao lado do
 * fogo) é o que faz alguém voltar amanhã; ela não zera só porque o dia de hoje ainda está em
 * branco, senão a tela puniria quem abriu o app de manhã.
 */
export default function HabitTracker({ habits, today }: { habits: HabitView[]; today: string }) {
  const router = useRouter()
  const [criando, setCriando] = useState(false)
  const [nome, setNome] = useState('')
  const [alvo, setAlvo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  // Otimismo local: o quadrado muda no clique e o servidor confirma depois. Esperar a ida e volta
  // para pintar um quadrado faz a tela parecer travada num gesto que devia ser instantâneo.
  const [otimista, setOtimista] = useState<Record<string, boolean>>({})

  const chave = (habitId: string, dateStr: string) => `${habitId}|${dateStr}`

  async function marcar(habitId: string, dateStr: string, done: boolean) {
    setErro(null)
    setOtimista((p) => ({ ...p, [chave(habitId, dateStr)]: done }))
    try {
      const res = await fetch(`/api/habitos/${habitId}/dias`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, done }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErro(d.error ?? 'Não foi possível registrar')
        // Desfaz o otimismo: deixar o quadrado pintado depois de um erro contaria uma mentira.
        setOtimista((p) => {
          const copia = { ...p }
          delete copia[chave(habitId, dateStr)]
          return copia
        })
        return
      }
      router.refresh()
    } catch {
      setErro('Não foi possível conectar ao servidor.')
      setOtimista((p) => {
        const copia = { ...p }
        delete copia[chave(habitId, dateStr)]
        return copia
      })
    }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado('novo')
    try {
      const res = await fetch('/api/habitos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nome, targetPerWeek: alvo ? Number(alvo) : undefined }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErro(d.error ?? 'Não foi possível criar o hábito')
        return
      }
      setNome('')
      setAlvo('')
      setCriando(false)
      router.refresh()
    } catch {
      setErro('Não foi possível conectar ao servidor.')
    } finally {
      setOcupado(null)
    }
  }

  async function arquivar(habitId: string) {
    setErro(null)
    setOcupado(habitId)
    try {
      const res = await fetch(`/api/habitos/${habitId}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErro(d.error ?? 'Não foi possível arquivar')
        return
      }
      router.refresh()
    } catch {
      setErro('Não foi possível conectar ao servidor.')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-gray-900">Meus hábitos</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Os últimos 7 dias. Toque no quadrado do dia para marcar.
          </p>
        </div>
        <button
          onClick={() => setCriando(!criando)}
          className="flex items-center gap-1.5 bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
        >
          <Plus size={15} /> Novo hábito
        </button>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">
          {erro}
        </div>
      )}

      {criando && (
        <form onSubmit={criar} className="border border-gray-100 rounded-xl p-4 mb-5 bg-gray-50/60">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-700 block mb-1.5">O hábito</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Beber 2 litros de água"
                maxLength={60}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-surface focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Vezes por semana <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <select
                value={alvo}
                onChange={(e) => setAlvo(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-surface focus:outline-none focus:border-emerald-500"
              >
                <option value="">Sem meta</option>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n}x
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              type="submit"
              disabled={ocupado === 'novo' || nome.trim().length < 2}
              className="bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {ocupado === 'novo' ? 'Criando...' : 'Criar hábito'}
            </button>
          </div>
        </form>
      )}

      {habits.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">
          Nenhum hábito ainda. Comece por um só — beber água, caminhar, não pular o café da manhã.
          Um hábito acompanhado vale mais que seis na lista.
        </p>
      ) : (
        <div className="space-y-3">
          {habits.map((h) => {
            const dias = h.days.map((d) => {
              const forcado = otimista[chave(h.id, d.dateStr)]
              return { ...d, done: forcado === undefined ? d.done : forcado }
            })
            const feitos = dias.filter((d) => d.done).length
            const bateuAMeta = h.targetPerWeek != null && feitos >= h.targetPerWeek

            return (
              <div key={h.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">{h.name}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {h.targetPerWeek != null && (
                        <span
                          className={`text-xs font-medium ${bateuAMeta ? 'text-emerald-600' : 'text-gray-500'}`}
                        >
                          {feitos} de {h.targetPerWeek}x na semana
                          {bateuAMeta && ' ✓'}
                        </span>
                      )}
                      {h.streak > 0 && (
                        <span
                          className="flex items-center gap-1 text-xs font-medium text-amber-600"
                          title="Dias seguidos cumpridos"
                        >
                          <Flame size={12} /> {h.streak} {h.streak === 1 ? 'dia' : 'dias'} seguidos
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => void arquivar(h.id)}
                    disabled={ocupado === h.id}
                    title="Arquivar: para de acompanhar, sem apagar o histórico"
                    aria-label={`Arquivar ${h.name}`}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Archive size={15} />
                  </button>
                </div>

                <div className="flex gap-1.5">
                  {dias.map((d) => {
                    const diaDaSemana = DIA_CURTO[new Date(`${d.dateStr}T12:00:00Z`).getUTCDay()]
                    return (
                      <button
                        key={d.dateStr}
                        onClick={() => void marcar(h.id, d.dateStr, !d.done)}
                        title={`${d.dateStr.split('-').reverse().join('/')}${d.done ? ' — cumprido' : ''}`}
                        className={`flex-1 aspect-square max-w-12 rounded-lg border flex flex-col items-center justify-center transition-colors ${
                          d.done
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-gray-200 text-gray-400 hover:border-emerald-300 hover:bg-emerald-50'
                        } ${d.isToday && !d.done ? 'ring-2 ring-emerald-200' : ''}`}
                      >
                        <span className="text-[10px] font-bold uppercase opacity-80">{diaDaSemana}</span>
                        {d.done ? (
                          <Check size={13} className="mt-0.5" />
                        ) : (
                          <span className="text-[10px] mt-0.5">{Number(d.dateStr.slice(8, 10))}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Como as suas medidas, os hábitos ficam visíveis para os nutricionistas com quem você tem
        consultas. Hoje é {today.split('-').reverse().join('/')}.
      </p>
    </div>
  )
}
