'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, Trash2, X } from 'lucide-react'
import { formatTimeBR } from '@/lib/format'

export interface AgendaEntryView {
  id: string
  kind: 'CONSULTA_EXTERNA' | 'COMPROMISSO'
  title: string
  modality: 'ONLINE' | 'PRESENCIAL' | 'AMBOS' | null
  startsAt: Date
  endsAt: Date
  note: string | null
}

/**
 * A agenda que o profissional mantém por conta própria.
 *
 * Existe porque a agenda dele não começa nem termina nesta plataforma: ele tem paciente antigo,
 * convênio, indicação, supervisão, médico. Sem um lugar para isso, ou ele mantinha duas agendas —
 * e a plataforma marcava por cima da outra —, ou deixava de usar esta.
 *
 * Os dois tipos bloqueiam o horário igual. A distinção é para a agenda dele fazer sentido daqui a
 * um mês, quando "10h–11h" sozinho não lembra mais nada.
 */
export default function NovoCompromisso({
  entries,
  hoje,
  ultimoDia,
}: {
  entries: AgendaEntryView[]
  hoje: string
  ultimoDia: string
}) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [kind, setKind] = useState<'CONSULTA_EXTERNA' | 'COMPROMISSO'>('CONSULTA_EXTERNA')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(hoje)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [modality, setModality] = useState<'ONLINE' | 'PRESENCIAL'>('PRESENCIAL')
  const [note, setNote] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [removendo, setRemovendo] = useState<string | null>(null)

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setAviso(null)
    setSalvando(true)
    try {
      const res = await fetch('/api/professional/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          title: title.trim(),
          date,
          startTime,
          endTime,
          modality: kind === 'CONSULTA_EXTERNA' ? modality : undefined,
          note: note.trim() || undefined,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErro(d.error ?? 'Não foi possível salvar o compromisso')
        return
      }
      // O conflito com uma consulta da plataforma não impede o registro, mas precisa ser dito:
      // o horário já foi vendido a alguém, e quem decide o que fazer é ele.
      if (d.aviso) setAviso(d.aviso)
      setTitle('')
      setNote('')
      setAberto(false)
      router.refresh()
    } catch {
      setErro('Não foi possível conectar ao servidor.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(id: string) {
    setRemovendo(id)
    setErro(null)
    try {
      const res = await fetch(`/api/professional/agenda/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErro(d.error ?? 'Não foi possível remover')
        return
      }
      router.refresh()
    } catch {
      setErro('Não foi possível conectar ao servidor.')
    } finally {
      setRemovendo(null)
    }
  }

  const agora = Date.now()
  const futuros = entries.filter((e) => e.endsAt.getTime() >= agora)

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-gray-900">Meus compromissos</h2>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed max-w-lg">
            Consultas combinadas fora da plataforma e qualquer outro compromisso. O horário sai da
            sua disponibilidade, então ninguém marca por cima.
          </p>
        </div>
        <button
          onClick={() => setAberto(!aberto)}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
        >
          {aberto ? <X size={15} /> : <CalendarPlus size={15} />}
          {aberto ? 'Cancelar' : 'Adicionar'}
        </button>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">
          {erro}
        </div>
      )}
      {aviso && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-2.5 mb-4">
          {aviso}
        </div>
      )}

      {aberto && (
        <form onSubmit={criar} className="border border-gray-100 rounded-xl p-4 mb-5 bg-gray-50/60 space-y-3">
          <div className="flex gap-2">
            {(
              [
                ['CONSULTA_EXTERNA', 'Consulta fora da plataforma'],
                ['COMPROMISSO', 'Outro compromisso'],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setKind(valor)}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                  kind === valor
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">
              {kind === 'CONSULTA_EXTERNA' ? 'Nome do paciente' : 'O compromisso'}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === 'CONSULTA_EXTERNA' ? 'Maria Souza' : 'Supervisão clínica'}
              maxLength={120}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-surface focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2 sm:col-span-2">
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Data</label>
              <input
                type="date"
                value={date}
                min={hoje}
                max={ultimoDia}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-surface focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Início</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-surface focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Fim</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-surface focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {kind === 'CONSULTA_EXTERNA' && (
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Formato</label>
              <div className="flex gap-2">
                {(
                  [
                    ['PRESENCIAL', 'Presencial'],
                    ['ONLINE', 'Online'],
                  ] as const
                ).map(([valor, rotulo]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setModality(valor)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      modality === valor
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">
              Observação <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-surface focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={salvando || title.trim().length < 2 || startTime >= endTime}
              className="bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Adicionar à agenda'}
            </button>
          </div>
        </form>
      )}

      {futuros.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">
          Nada além das consultas da plataforma nos próximos dias.
        </p>
      ) : (
        <div className="divide-y divide-gray-50">
          {futuros.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 py-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                      e.kind === 'CONSULTA_EXTERNA'
                        ? 'bg-purple-50 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {e.kind === 'CONSULTA_EXTERNA' ? 'fora da plataforma' : 'compromisso'}
                  </span>
                  <p className="text-sm font-medium text-gray-900">{e.title}</p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {e.startsAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} ·{' '}
                  {formatTimeBR(e.startsAt)} às {formatTimeBR(e.endsAt)}
                  {e.modality && ` · ${e.modality === 'ONLINE' ? 'online' : 'presencial'}`}
                  {e.note && ` · ${e.note}`}
                </p>
              </div>
              <button
                onClick={() => void remover(e.id)}
                disabled={removendo === e.id}
                aria-label={`Remover ${e.title}`}
                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
