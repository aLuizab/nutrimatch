'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Video, MapPin, FileText, Clock, UserCheck } from 'lucide-react'
import { addDaysToDateString, mondayOfWeek, spDateString, spHour } from '@/lib/spdate'
import { initials, avatarColor, formatDateBR, formatTimeBR } from '@/lib/format'
import type { AttendanceStatus, Modality } from '@prisma/client'

export interface AgendaAppointment {
  id: string
  scheduledAt: Date
  patientName: string
  reason: string | null
  modality: Modality
  summary: string | null
  status: 'CONFIRMED' | 'AWAITING_CONFIRMATION'
  confirmationDeadline: Date | null
  meetingUrl: string | null
  meetingOpen: boolean
  attendance: AttendanceStatus
}

/**
 * Marcação de comparecimento. Fica junto do resumo porque é o mesmo momento: o profissional
 * abre a consulta que já passou para registrar o que aconteceu.
 */
function AttendancePanel({ appointment, onDone }: { appointment: AgendaAppointment; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'ATTENDED' | 'NO_SHOW' | null>(null)

  async function mark(attendance: 'ATTENDED' | 'NO_SHOW') {
    setError(null)
    setBusy(attendance)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Não foi possível marcar')
        return
      }
      onDone()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setBusy(null)
    }
  }

  if (appointment.attendance === 'CONTESTED') {
    return (
      <div className="w-full mt-4 border-t border-gray-100 pt-4">
        <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          O paciente contestou a falta registrada. Enquanto isso, ela não conta para nenhum dos
          dois lados.
        </p>
      </div>
    )
  }

  if (appointment.attendance !== 'PENDING') {
    const attended = appointment.attendance === 'ATTENDED'
    return (
      <div className="w-full mt-4 border-t border-gray-100 pt-4">
        <p className={`text-xs font-medium ${attended ? 'text-emerald-700' : 'text-gray-600'}`}>
          {attended ? '✓ Paciente compareceu' : '✕ Registrado como falta'}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full mt-4 border-t border-gray-100 pt-4">
      <p className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
        <UserCheck size={13} className="text-emerald-500" /> O paciente compareceu?
      </p>
      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-2">{error}</div>}
      <div className="flex gap-2">
        <button
          onClick={() => mark('ATTENDED')}
          disabled={busy !== null}
          className="flex-1 text-sm font-medium text-emerald-700 border border-emerald-200 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors disabled:opacity-50"
        >
          {busy === 'ATTENDED' ? 'Salvando...' : 'Compareceu'}
        </button>
        <button
          onClick={() => mark('NO_SHOW')}
          disabled={busy !== null}
          className="flex-1 text-sm font-medium text-gray-600 border border-gray-200 py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {busy === 'NO_SHOW' ? 'Salvando...' : 'Não compareceu'}
        </button>
      </div>
      <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
        Sem marcação, em 7 dias a consulta conta automaticamente como comparecida. O paciente é
        avisado de uma falta e pode contestá-la.
      </p>
    </div>
  )
}

function ConfirmPanel({ appointment, onDone }: { appointment: AgendaAppointment; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'confirm' | 'decline' | null>(null)

  async function act(status: 'CONFIRMED' | 'CANCELLED') {
    setError(null)
    setBusy(status === 'CONFIRMED' ? 'confirm' : 'decline')
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Não foi possível atualizar a consulta')
        return
      }
      onDone()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setBusy(null)
    }
  }

  const hoursLeft = appointment.confirmationDeadline
    ? Math.max(0, Math.round((appointment.confirmationDeadline.getTime() - Date.now()) / 3600000))
    : null

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold text-orange-800">
            <Clock size={14} /> Aguardando sua confirmação
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {hoursLeft !== null && hoursLeft > 0
              ? `Restam ~${hoursLeft}h para confirmar. Depois disso o horário é liberado.`
              : 'O prazo de confirmação está encerrando.'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => act('CANCELLED')}
            disabled={busy !== null}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {busy === 'decline' ? 'Recusando...' : 'Recusar'}
          </button>
          <button
            onClick={() => act('CONFIRMED')}
            disabled={busy !== null}
            className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {busy === 'confirm' ? 'Confirmando...' : 'Confirmar consulta'}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}

function SummaryEditor({ appointment, onSaved }: { appointment: AgendaAppointment; onSaved: () => void }) {
  const [text, setText] = useState(appointment.summary ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setError(null)
    if (!text.trim()) {
      setError('O resumo não pode ficar vazio')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: text.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Não foi possível salvar o resumo')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onSaved()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full mt-4 border-t border-gray-100 pt-4">
      <p className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
        <FileText size={13} className="text-emerald-500" /> Resumo da consulta
        <span className="normal-case font-normal text-gray-400">— visível para o paciente</span>
      </p>
      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-2">{error}</div>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Orientações, plano alimentar resumido, próximos passos..."
        rows={3}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm text-emerald-600 font-medium">{saved && 'Resumo salvo!'}</span>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar resumo'}
        </button>
      </div>
    </div>
  )
}

export default function AgendaGrid({ appointments }: { appointments: AgendaAppointment[] }) {
  const router = useRouter()
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const todayStr = useMemo(() => spDateString(new Date()), [])
  const mondayStr = mondayOfWeek(todayStr, weekOffset)
  const weekDates = useMemo(() => Array.from({ length: 5 }, (_, i) => addDaysToDateString(mondayStr, i)), [mondayStr])

  const byCell = useMemo(() => {
    const map = new Map<string, AgendaAppointment[]>()
    for (const a of appointments) {
      const key = `${spDateString(a.scheduledAt)}|${spHour(a.scheduledAt)}`
      const list = map.get(key) ?? []
      list.push(a)
      map.set(key, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    }
    return map
  }, [appointments])

  // Base range 8h–18h, stretched to cover any booked hour (evening blocks etc.) so no
  // appointment is ever outside the grid.
  const hours = useMemo(() => {
    let min = 8
    let max = 18
    for (const a of appointments) {
      const h = spHour(a.scheduledAt)
      if (h < min) min = h
      if (h > max) max = h
    }
    return Array.from({ length: max - min + 1 }, (_, i) => min + i)
  }, [appointments])

  const selected = appointments.find((a) => a.id === selectedId) ?? null

  return (
    <>
      <div className="bg-white border-b border-gray-100 px-8 py-5 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie suas consultas semanais</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setWeekOffset(weekOffset - 1)} aria-label="Semana anterior" className="p-2 rounded-lg hover:bg-white transition-colors">
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700 px-2">
              {weekOffset === 0 ? 'Esta semana' : weekOffset < 0 ? `${Math.abs(weekOffset)} sem. atrás` : `${weekOffset} sem. à frente`}
            </span>
            <button onClick={() => setWeekOffset(weekOffset + 1)} aria-label="Próxima semana" className="p-2 rounded-lg hover:bg-white transition-colors">
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-4 py-2 text-sm font-medium text-emerald-600 border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-colors"
          >
            Hoje
          </button>
        </div>
      </div>

      <div className="p-8">
        <div className="flex gap-4 mb-5 text-xs font-medium text-gray-500">
          <div className="flex items-center gap-1.5"><Video size={12} className="text-blue-500" /> Online</div>
          <div className="flex items-center gap-1.5"><MapPin size={12} className="text-emerald-500" /> Presencial</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: '64px repeat(5, 1fr)' }}>
            <div className="border-r border-gray-100" />
            {weekDates.map((dateStr, i) => (
              <div
                key={dateStr}
                className={`py-3 px-3 text-center border-r border-gray-100 last:border-0 ${dateStr === todayStr ? 'bg-emerald-50' : ''}`}
              >
                <p className="text-xs font-bold text-gray-500">{['Seg', 'Ter', 'Qua', 'Qui', 'Sex'][i]}</p>
                <p className={`text-xl font-bold mt-0.5 ${dateStr === todayStr ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {dateStr.slice(8, 10)}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '560px' }}>
            {hours.map((h) => (
              <div key={h} className="grid border-b border-gray-50 last:border-0" style={{ gridTemplateColumns: '64px repeat(5, 1fr)', minHeight: '72px' }}>
                <div className="border-r border-gray-100 flex items-start justify-end pr-3 pt-2">
                  <span className="text-xs text-gray-400 font-medium">{String(h).padStart(2, '0')}:00</span>
                </div>
                {weekDates.map((dateStr) => {
                  const appts = byCell.get(`${dateStr}|${h}`) ?? []
                  return (
                    <div key={dateStr} className={`border-r border-gray-50 last:border-0 p-1.5 space-y-1 ${dateStr === todayStr ? 'bg-emerald-50/30' : ''}`}>
                      {appts.map((appt) => (
                        <button
                          key={appt.id}
                          onClick={() => setSelectedId(appt.id === selectedId ? null : appt.id)}
                          className={`w-full text-left p-2 rounded-lg border text-xs font-medium transition-all hover:shadow-sm bg-white ${
                            // Awaiting bookings get their own colour and a dashed edge: they
                            // need action, and must not look like a settled appointment.
                            appt.status === 'AWAITING_CONFIRMATION'
                              ? 'border-orange-300 border-dashed text-orange-800 bg-orange-50'
                              : appt.modality === 'PRESENCIAL'
                                ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                                : 'border-blue-300 text-blue-800 bg-blue-50'
                          } ${selectedId === appt.id ? 'ring-2 ring-offset-1 ring-emerald-400' : ''}`}
                        >
                          <p className="font-bold truncate">{appt.patientName}</p>
                          <p className="opacity-70 mt-0.5 flex items-center gap-1">
                            {appt.status === 'AWAITING_CONFIRMATION' ? (
                              <Clock size={10} />
                            ) : appt.modality === 'PRESENCIAL' ? (
                              <MapPin size={10} />
                            ) : (
                              <Video size={10} />
                            )}
                            {formatTimeBR(appt.scheduledAt)} ·{' '}
                            {appt.status === 'AWAITING_CONFIRMATION' ? 'Confirmar' : (appt.reason ?? 'Consulta')}
                          </p>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 ${avatarColor(selected.id)} text-white rounded-full flex items-center justify-center text-sm font-bold`}>
                {initials(selected.patientName)}
              </div>
              <div>
                <p className="font-bold text-gray-900">{selected.patientName}</p>
                <p className="text-xs text-gray-500">
                  {selected.reason ?? 'Consulta'} · {selected.modality === 'PRESENCIAL' ? 'Presencial' : 'Online'} ·{' '}
                  {formatDateBR(selected.scheduledAt)} às {formatTimeBR(selected.scheduledAt)}
                </p>
              </div>
            </div>
            {selected.meetingUrl && selected.meetingOpen && selected.status === 'CONFIRMED' && (
              <a
                href={selected.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-white bg-emerald-500 px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
              >
                <Video size={14} /> Entrar na consulta
              </a>
            )}
            {selected.status === 'AWAITING_CONFIRMATION' ? (
              <ConfirmPanel appointment={selected} onDone={() => router.refresh()} />
            ) : selected.scheduledAt.getTime() <= Date.now() ? (
              <>
                <AttendancePanel appointment={selected} onDone={() => router.refresh()} />
                <SummaryEditor appointment={selected} onSaved={() => router.refresh()} />
              </>
            ) : (
              <p className="mt-3 text-xs text-gray-400">
                Após a consulta, você poderá escrever aqui um resumo que fica visível para o paciente.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
