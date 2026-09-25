'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarOff, CalendarPlus, Plus, RotateCcw, Trash2 } from 'lucide-react'
import CalendarioMeses from '../components/CalendarioMeses'

export interface ExcecaoDeData {
  date: string
  closed: boolean
  blocks: { startTime: string; endTime: string }[]
}

const MAX_BLOCOS = 4

/**
 * Exceções de data, em cima da grade semanal.
 *
 * A grade semanal responde "como é a minha semana"; esta tela responde "e nestes dias, não".
 * São perguntas diferentes e por isso ficam separadas — e o texto precisa dizer isso, porque um
 * calendário logo abaixo de um formulário de horários parece ser o mesmo assunto.
 */
export default function DisponibilidadePorData({
  primeiroDia,
  ultimoDia,
  excecoes,
}: {
  primeiroDia: string
  ultimoDia: string
  excecoes: ExcecaoDeData[]
}) {
  const router = useRouter()
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const porData = new Map(excecoes.map((e) => [e.date, e]))
  const atual = selecionado ? porData.get(selecionado) : undefined

  // Rascunho local do dia aberto. Começa do que está salvo, ou de um bloco vazio quando a pessoa
  // clica em "horário especial" num dia que hoje segue a semana.
  const [rascunho, setRascunho] = useState<ExcecaoDeData | null>(null)

  function abrir(dateStr: string) {
    setErro(null)
    setSelecionado(dateStr)
    const existente = porData.get(dateStr)
    setRascunho(
      existente
        ? { ...existente, blocks: existente.blocks.map((b) => ({ ...b })) }
        : { date: dateStr, closed: false, blocks: [] }
    )
  }

  async function salvar(payload: ExcecaoDeData) {
    setSalvando(true)
    setErro(null)
    try {
      const res = await fetch('/api/professional/availability/datas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: payload.date, closed: payload.closed, blocks: payload.blocks }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErro(d.error ?? 'Não foi possível salvar esta data')
        return
      }
      setSelecionado(null)
      setRascunho(null)
      router.refresh()
    } catch {
      setErro('Não foi possível conectar ao servidor.')
    } finally {
      setSalvando(false)
    }
  }

  // Todas as datas da janela recebem marca: sem marca o calendário trata o dia como não
  // clicável, e aqui qualquer dia futuro pode receber uma exceção.
  const marcas: Record<string, { tone: string; nota?: string; title?: string }> = {}
  for (let d = primeiroDia; d <= ultimoDia; d = proximoDia(d)) {
    const e = porData.get(d)
    if (e?.closed) {
      marcas[d] = {
        tone: 'border-red-200 bg-red-50 text-red-700',
        nota: 'fechado',
        title: 'Dia fechado: nenhum horário, mesmo que a semana diga o contrário',
      }
    } else if (e && e.blocks.length > 0) {
      marcas[d] = {
        tone: 'border-blue-200 bg-blue-50 text-blue-700',
        nota: 'especial',
        title: `Horário especial: ${e.blocks.map((b) => `${b.startTime}–${b.endTime}`).join(', ')}`,
      }
    } else {
      marcas[d] = {
        tone: 'border-gray-200 text-gray-600',
        title: 'Segue a grade semanal',
      }
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-base font-bold text-gray-900 mb-1">Datas que fogem da semana</h3>
      <p className="text-sm text-gray-500 mb-5 leading-relaxed">
        A grade acima vale para toda semana. Aqui você trata as exceções: feriado, viagem,
        congresso, ou um dia em que vai atender num horário diferente. O paciente pode marcar com
        até 3 meses de antecedência, e é essa a janela do calendário.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <CalendarioMeses
            primeiroDia={primeiroDia}
            ultimoDia={ultimoDia}
            marcas={marcas}
            selecionado={selecionado}
            onSelecionar={abrir}
          />
          <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-gray-200" /> segue a semana
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-red-200 bg-red-50" /> fechado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-blue-200 bg-blue-50" /> horário especial
            </span>
          </div>
        </div>

        <div>
          {!selecionado || !rascunho ? (
            <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl p-6 text-center">
              Escolha uma data no calendário para fechá-la ou dar a ela um horário próprio.
            </p>
          ) : (
            <div className="border border-gray-100 rounded-xl p-4">
              <p className="text-sm font-bold text-gray-900 mb-3">
                {selecionado.split('-').reverse().join('/')}
              </p>

              {erro && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
                  {erro}
                </p>
              )}

              {rascunho.closed ? (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 mb-3">
                  Este dia está <strong>fechado</strong>. Nenhum horário aparece para o paciente,
                  mesmo que a grade da semana tenha um.
                </p>
              ) : rascunho.blocks.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {rascunho.blocks.map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={b.startTime}
                        onChange={(e) =>
                          setRascunho({
                            ...rascunho,
                            blocks: rascunho.blocks.map((x, j) =>
                              j === i ? { ...x, startTime: e.target.value } : x
                            ),
                          })
                        }
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-gray-400 text-sm">até</span>
                      <input
                        type="time"
                        value={b.endTime}
                        onChange={(e) =>
                          setRascunho({
                            ...rascunho,
                            blocks: rascunho.blocks.map((x, j) =>
                              j === i ? { ...x, endTime: e.target.value } : x
                            ),
                          })
                        }
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        aria-label="Remover bloco"
                        onClick={() =>
                          setRascunho({
                            ...rascunho,
                            blocks: rascunho.blocks.filter((_, j) => j !== i),
                          })
                        }
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {rascunho.blocks.length < MAX_BLOCOS && (
                    <button
                      type="button"
                      onClick={() =>
                        setRascunho({
                          ...rascunho,
                          blocks: [...rascunho.blocks, { startTime: '09:00', endTime: '12:00' }],
                        })
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:underline"
                    >
                      <Plus size={13} /> Outro bloco
                    </button>
                  )}
                  <p className="text-xs text-gray-400 pt-1">
                    Estes horários <strong>substituem</strong> a grade da semana neste dia — não
                    somam a ela.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-3">
                  Hoje esta data segue a grade da semana.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {!rascunho.closed && (
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() => void salvar({ date: rascunho.date, closed: true, blocks: [] })}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 border border-red-200 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <CalendarOff size={14} /> Fechar o dia
                  </button>
                )}
                {rascunho.blocks.length === 0 && !rascunho.closed && (
                  <button
                    type="button"
                    onClick={() =>
                      setRascunho({
                        ...rascunho,
                        blocks: [{ startTime: '09:00', endTime: '12:00' }],
                      })
                    }
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 border border-blue-200 px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors"
                  >
                    <CalendarPlus size={14} /> Horário especial
                  </button>
                )}
                {rascunho.blocks.length > 0 && (
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() => void salvar(rascunho)}
                    className="bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    {salvando ? 'Salvando...' : 'Salvar horário do dia'}
                  </button>
                )}
                {atual && (
                  <button
                    type="button"
                    disabled={salvando}
                    title="Apaga a exceção: o dia volta a seguir a grade da semana"
                    onClick={() => void salvar({ date: rascunho.date, closed: false, blocks: [] })}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw size={14} /> Voltar ao normal
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Próximo dia de uma data 'YYYY-MM-DD'. Local porque o laço de marcas roda no cliente. */
function proximoDia(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + 1)
  return dt.toISOString().slice(0, 10)
}
