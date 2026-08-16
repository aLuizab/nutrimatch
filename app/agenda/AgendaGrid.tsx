'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Video, MapPin } from 'lucide-react'
import { addDaysToDateString, mondayOfWeek, spDateString, spHour } from '@/lib/spdate'
import { initials, avatarColor } from '@/lib/format'
import type { Modality } from '@prisma/client'

export interface AgendaAppointment {
  id: string
  scheduledAt: Date
  patientName: string
  reason: string | null
  modality: Modality
}

const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i) // 08:00–18:00

export default function AgendaGrid({ appointments }: { appointments: AgendaAppointment[] }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const todayStr = useMemo(() => spDateString(new Date()), [])
  const mondayStr = mondayOfWeek(todayStr, weekOffset)
  const weekDates = useMemo(() => Array.from({ length: 5 }, (_, i) => addDaysToDateString(mondayStr, i)), [mondayStr])

  const byCell = useMemo(() => {
    const map = new Map<string, AgendaAppointment>()
    for (const a of appointments) {
      const dateStr = spDateString(a.scheduledAt)
      const hour = spHour(a.scheduledAt)
      map.set(`${dateStr}|${hour}`, a)
    }
    return map
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
            <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-2 rounded-lg hover:bg-white transition-colors">
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700 px-2">
              {weekOffset === 0 ? 'Esta semana' : weekOffset < 0 ? `${Math.abs(weekOffset)} sem. atrás` : `${weekOffset} sem. à frente`}
            </span>
            <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-2 rounded-lg hover:bg-white transition-colors">
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
            {HOURS.map((h) => (
              <div key={h} className="grid border-b border-gray-50 last:border-0" style={{ gridTemplateColumns: '64px repeat(5, 1fr)', minHeight: '72px' }}>
                <div className="border-r border-gray-100 flex items-start justify-end pr-3 pt-2">
                  <span className="text-xs text-gray-400 font-medium">{String(h).padStart(2, '0')}:00</span>
                </div>
                {weekDates.map((dateStr) => {
                  const appt = byCell.get(`${dateStr}|${h}`)
                  return (
                    <div key={dateStr} className={`border-r border-gray-50 last:border-0 p-1.5 ${dateStr === todayStr ? 'bg-emerald-50/30' : ''}`}>
                      {appt && (
                        <button
                          onClick={() => setSelectedId(appt.id === selectedId ? null : appt.id)}
                          className={`w-full text-left p-2 rounded-lg border text-xs font-medium transition-all hover:shadow-sm bg-white ${
                            appt.modality === 'PRESENCIAL' ? 'border-emerald-300 text-emerald-800 bg-emerald-50' : 'border-blue-300 text-blue-800 bg-blue-50'
                          } ${selectedId === appt.id ? 'ring-2 ring-offset-1 ring-emerald-400' : ''}`}
                        >
                          <p className="font-bold truncate">{appt.patientName}</p>
                          <p className="opacity-70 mt-0.5 flex items-center gap-1">
                            {appt.modality === 'PRESENCIAL' ? <MapPin size={10} /> : <Video size={10} />}
                            {appt.reason ?? 'Consulta'}
                          </p>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 ${avatarColor(selected.id)} text-white rounded-full flex items-center justify-center text-sm font-bold`}>
                {initials(selected.patientName)}
              </div>
              <div>
                <p className="font-bold text-gray-900">{selected.patientName}</p>
                <p className="text-xs text-gray-500">
                  {selected.reason ?? 'Consulta'} · {selected.modality === 'PRESENCIAL' ? 'Presencial' : 'Online'} ·{' '}
                  {spDateString(selected.scheduledAt)} às {String(spHour(selected.scheduledAt)).padStart(2, '0')}:00
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 text-sm border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50">
                Ver prontuário
              </button>
              <button className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600">
                Iniciar consulta
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
