'use client'

import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Video, MapPin, Plus } from 'lucide-react'
import ProfessionalSidebar from '../components/ProfessionalSidebar'

const weekDays = ['Seg 02/06', 'Ter 03/06', 'Qua 04/06', 'Qui 05/06', 'Sex 06/06']
const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

type Appointment = {
  day: number
  hour: number
  name: string
  type: string
  modality: 'online' | 'presencial'
  color: string
}

const appointments: Appointment[] = [
  { day: 0, hour: 9, name: 'Ana Silva', type: 'Retorno', modality: 'online', color: 'bg-blue-100 border-blue-300 text-blue-800' },
  { day: 0, hour: 11, name: 'Carlos Mendes', type: 'Primeira consulta', modality: 'presencial', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
  { day: 1, hour: 8, name: 'Juliana Rocha', type: 'Retorno', modality: 'online', color: 'bg-purple-100 border-purple-300 text-purple-800' },
  { day: 1, hour: 14, name: 'Roberto Lima', type: 'Avaliação', modality: 'presencial', color: 'bg-orange-100 border-orange-300 text-orange-800' },
  { day: 2, hour: 10, name: 'Beatriz Costa', type: 'Retorno', modality: 'online', color: 'bg-pink-100 border-pink-300 text-pink-800' },
  { day: 2, hour: 15, name: 'Marcos Oliveira', type: 'Primeira consulta', modality: 'online', color: 'bg-teal-100 border-teal-300 text-teal-800' },
  { day: 3, hour: 9, name: 'Fernanda Santos', type: 'Retorno', modality: 'presencial', color: 'bg-indigo-100 border-indigo-300 text-indigo-800' },
  { day: 4, hour: 13, name: 'Diego Alves', type: 'Retorno', modality: 'online', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
  { day: 4, hour: 16, name: 'Clara Nunes', type: 'Avaliação', modality: 'presencial', color: 'bg-red-100 border-red-300 text-red-800' },
]

export default function Agenda() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)

  const getAppt = (dayIdx: number, hourIdx: number) =>
    appointments.find((a) => a.day === dayIdx && a.hour === hourIdx + 8)

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <ProfessionalSidebar />

      <main className="flex-1 overflow-auto">
        {/* Header */}
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
          {/* Legenda */}
          <div className="flex gap-4 mb-5 text-xs font-medium text-gray-500">
            <div className="flex items-center gap-1.5"><Video size={12} className="text-blue-500" /> Online</div>
            <div className="flex items-center gap-1.5"><MapPin size={12} className="text-emerald-500" /> Presencial</div>
          </div>

          {/* Grade semanal */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Cabeçalho dos dias */}
            <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: '64px repeat(5, 1fr)' }}>
              <div className="border-r border-gray-100" />
              {weekDays.map((d, i) => (
                <div key={d} className={`py-3 px-3 text-center border-r border-gray-100 last:border-0 ${i === 2 ? 'bg-emerald-50' : ''}`}>
                  <p className="text-xs font-bold text-gray-500">{d.split(' ')[0]}</p>
                  <p className={`text-xl font-bold mt-0.5 ${i === 2 ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {d.split(' ')[1].split('/')[0]}
                  </p>
                </div>
              ))}
            </div>

            {/* Linhas de horário */}
            <div className="overflow-y-auto" style={{ maxHeight: '560px' }}>
              {hours.map((h, hourIdx) => (
                <div
                  key={h}
                  className="grid border-b border-gray-50 last:border-0"
                  style={{ gridTemplateColumns: '64px repeat(5, 1fr)', minHeight: '72px' }}
                >
                  <div className="border-r border-gray-100 flex items-start justify-end pr-3 pt-2">
                    <span className="text-xs text-gray-400 font-medium">{h}</span>
                  </div>
                  {weekDays.map((d, dayIdx) => {
                    const appt = getAppt(dayIdx, hourIdx)
                    return (
                      <div
                        key={d}
                        className={`border-r border-gray-50 last:border-0 p-1.5 ${dayIdx === 2 ? 'bg-emerald-50/30' : ''}`}
                      >
                        {appt && (
                          <button
                            onClick={() => setSelectedAppt(appt === selectedAppt ? null : appt)}
                            className={`w-full text-left p-2 rounded-lg border text-xs font-medium transition-all hover:shadow-sm ${appt.color} ${
                              selectedAppt === appt ? 'ring-2 ring-offset-1 ring-emerald-400' : ''
                            }`}
                          >
                            <p className="font-bold truncate">{appt.name}</p>
                            <p className="opacity-70 mt-0.5 flex items-center gap-1">
                              {appt.modality === 'online' ? <Video size={10} /> : <MapPin size={10} />}
                              {appt.type}
                            </p>
                          </button>
                        )}
                        {!appt && (
                          <button className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group">
                            <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1">
                              <Plus size={12} /> Agendar
                            </div>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Detalhe do appointment selecionado */}
          {selectedAppt && (
            <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${selectedAppt.color}`}>
                  {selectedAppt.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selectedAppt.name}</p>
                  <p className="text-xs text-gray-500">{selectedAppt.type} · {selectedAppt.modality === 'online' ? 'Online' : 'Presencial'} · {weekDays[selectedAppt.day]} às {`${selectedAppt.hour}:00`}</p>
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
      </main>
    </div>
  )
}
