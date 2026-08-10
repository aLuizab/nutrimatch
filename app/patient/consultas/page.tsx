'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Calendar, Video, MapPin, Star, Clock } from 'lucide-react'
import PatientSidebar from '../../components/PatientSidebar'

const upcoming = [
  { id: 1, doctor: 'Dra. Carolina Matos', specialty: 'Nutrição Esportiva', date: 'Qua, 04/06/2026', time: '14:30', modality: 'online', type: 'Retorno', initials: 'CM', color: 'bg-emerald-500' },
  { id: 2, doctor: 'Dra. Carolina Matos', specialty: 'Nutrição Esportiva', date: 'Ter, 01/07/2026', time: '10:00', modality: 'online', type: 'Retorno', initials: 'CM', color: 'bg-emerald-500' },
]

const past = [
  { id: 3, doctor: 'Dra. Carolina Matos', specialty: 'Nutrição Esportiva', date: '14/05/2026', time: '14:30', modality: 'online', type: 'Retorno', initials: 'CM', color: 'bg-emerald-500', rated: true, rating: 5 },
  { id: 4, doctor: 'Dra. Carolina Matos', specialty: 'Nutrição Esportiva', date: '24/04/2026', time: '09:00', modality: 'presencial', type: 'Primeira consulta', initials: 'CM', color: 'bg-emerald-500', rated: true, rating: 5 },
  { id: 5, doctor: 'Dr. Rafael Costa', specialty: 'Nutrição Clínica', date: '10/03/2026', time: '11:00', modality: 'online', type: 'Consulta avulsa', initials: 'RC', color: 'bg-blue-500', rated: false, rating: 0 },
]

export default function MinhasConsultas() {
  const [activeTab, setActiveTab] = useState<'proximas' | 'historico'>('proximas')
  const [ratingModal, setRatingModal] = useState<number | null>(null)
  const [hoverRating, setHoverRating] = useState(0)

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <PatientSidebar />

      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-100 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900">Minhas Consultas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie seus agendamentos e histórico</p>
        </div>

        <div className="p-8">
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 w-fit mb-6">
            <button
              onClick={() => setActiveTab('proximas')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'proximas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock size={15} /> Próximas ({upcoming.length})
            </button>
            <button
              onClick={() => setActiveTab('historico')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'historico' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar size={15} /> Histórico ({past.length})
            </button>
          </div>

          {activeTab === 'proximas' && (
            <div className="space-y-4">
              {upcoming.map((appt) => (
                <div key={appt.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className={`w-14 h-14 ${appt.color} text-white rounded-full flex items-center justify-center text-lg font-bold shrink-0`}>
                      {appt.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900">{appt.doctor}</h3>
                      <p className="text-sm text-gray-500">{appt.specialty} · {appt.type}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-emerald-500" /> {appt.date}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} className="text-emerald-500" /> {appt.time}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {appt.modality === 'online' ? <Video size={14} className="text-blue-500" /> : <MapPin size={14} className="text-emerald-500" />}
                          {appt.modality === 'online' ? 'Online' : 'Presencial'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button className="text-sm font-medium text-gray-600 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                        Reagendar
                      </button>
                      <button className="text-sm font-medium text-red-500 border border-red-100 px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors">
                        Cancelar
                      </button>
                      {appt.modality === 'online' && (
                        <button className="text-sm font-bold text-white bg-emerald-500 px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors">
                          Entrar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {upcoming.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-gray-400 font-medium">Nenhuma consulta agendada</p>
                  <Link href="/resultados" className="inline-block mt-3 text-emerald-600 text-sm font-medium border border-emerald-200 px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors">
                    Buscar nutricionista
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="space-y-4">
              {past.map((appt) => (
                <div key={appt.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className={`w-14 h-14 ${appt.color} text-white rounded-full flex items-center justify-center text-lg font-bold shrink-0`}>
                      {appt.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900">{appt.doctor}</h3>
                      <p className="text-sm text-gray-500">{appt.specialty} · {appt.type}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} /> {appt.date}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} /> {appt.time}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {appt.modality === 'online' ? <Video size={14} /> : <MapPin size={14} />}
                          {appt.modality === 'online' ? 'Online' : 'Presencial'}
                        </span>
                      </div>
                      {appt.rated && (
                        <div className="flex items-center gap-1 mt-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={13} className={i < appt.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                          ))}
                          <span className="text-xs text-gray-400 ml-1">Avaliado</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!appt.rated && (
                        <button
                          onClick={() => setRatingModal(appt.id)}
                          className="text-sm font-medium text-yellow-600 border border-yellow-200 px-4 py-2.5 rounded-xl hover:bg-yellow-50 transition-colors"
                        >
                          Avaliar
                        </button>
                      )}
                      <Link href="/agendamento" className="text-sm font-bold text-white bg-emerald-500 px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors">
                        Reagendar
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal de avaliação */}
      {ratingModal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Avaliar consulta</h3>
            <p className="text-sm text-gray-500 mb-5">Como foi sua experiência?</p>

            <div className="flex justify-center gap-3 mb-5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setHoverRating(n)}
                  className="transition-transform hover:scale-110"
                >
                  <Star size={32} className={n <= (hoverRating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                </button>
              ))}
            </div>

            <textarea
              placeholder="Conte como foi sua consulta (opcional)..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 resize-none mb-4"
            />

            <div className="flex gap-3">
              <button onClick={() => setRatingModal(null)} className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl hover:bg-gray-50 text-sm">
                Cancelar
              </button>
              <button onClick={() => setRatingModal(null)} className="flex-1 bg-emerald-500 text-white font-bold py-2.5 rounded-xl hover:bg-emerald-600 text-sm">
                Enviar avaliação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
