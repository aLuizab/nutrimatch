'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Clock, Video, CheckCircle } from 'lucide-react'
import PublicHeader from '../components/PublicHeader'

const days = [
  { day: 'Seg', date: '02/06', times: ['09:00', '10:00', '15:00', '16:30'] },
  { day: 'Ter', date: '03/06', times: ['08:30', '11:00', '14:30', '16:00'] },
  { day: 'Qua', date: '04/06', times: ['09:00', '10:30', '15:30'] },
  { day: 'Qui', date: '05/06', times: ['10:00', '11:00', '14:00', '17:00'] },
  { day: 'Sex', date: '06/06', times: ['09:30', '13:00', '15:00'] },
]

export default function Agendamento() {
  const router = useRouter()
  const [selectedDay, setSelectedDay] = useState(0)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [modality, setModality] = useState<'online' | 'presencial'>('online')
  const [confirmed, setConfirmed] = useState(false)

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTime) return
    setConfirmed(true)
    setTimeout(() => router.push('/patient/dashboard'), 2000)
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-emerald-500" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Consulta agendada!</h2>
          <p className="text-gray-500">
            {days[selectedDay].day} {days[selectedDay].date} às {selectedTime} com Dra. Carolina Matos
          </p>
          <p className="text-sm text-gray-400 mt-4">Redirecionando para seu painel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PublicHeader />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/perfil" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft size={16} /> Voltar ao perfil
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Agendar Consulta</h1>
        <p className="text-gray-500 text-sm mb-8">Escolha o horário e preencha seus dados para confirmar</p>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Coluna esquerda: calendário */}
          <div className="flex-1 space-y-6">
            {/* Profissional */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xl font-bold shrink-0">
                CM
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Dra. Carolina Matos</h3>
                <p className="text-sm text-gray-500">Nutrição Esportiva</p>
                <p className="text-sm font-bold text-emerald-600 mt-0.5">R$ 150 /consulta</p>
              </div>
            </div>

            {/* Modalidade */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Modalidade de atendimento</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setModality('online')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                    modality === 'online' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Video size={16} /> Online
                </button>
                <button
                  onClick={() => setModality('presencial')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                    modality === 'presencial' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Calendar size={16} /> Presencial
                </button>
              </div>
            </div>

            {/* Dias da semana */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-emerald-500" /> Junho 2026
              </h3>
              <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
                {days.map((d, i) => (
                  <button
                    key={d.day}
                    onClick={() => { setSelectedDay(i); setSelectedTime(null) }}
                    className={`shrink-0 w-16 flex flex-col items-center py-3 rounded-xl border-2 text-xs font-medium transition-colors ${
                      selectedDay === i ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-200 text-gray-600 hover:border-emerald-300'
                    }`}
                  >
                    <span>{d.day}</span>
                    <span className="text-lg font-bold mt-0.5">{d.date.split('/')[0]}</span>
                    <span className="text-[10px] mt-0.5 opacity-70">{d.times.length} vagas</span>
                  </button>
                ))}
              </div>

              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Clock size={16} className="text-emerald-500" /> Horários disponíveis
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {days[selectedDay].times.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTime(t)}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      selectedTime === t
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-emerald-400 hover:bg-emerald-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna direita: formulário */}
          <div className="w-full lg:w-96 shrink-0">
            <form onSubmit={handleConfirm} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h3 className="text-base font-bold text-gray-900">Seus dados</h3>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Nome completo</label>
                <input type="text" placeholder="Seu nome" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">E-mail</label>
                <input type="email" placeholder="seu@email.com" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Telefone</label>
                <input type="tel" placeholder="(11) 99999-9999" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Motivo da consulta</label>
                <textarea
                  placeholder="Descreva brevemente seu objetivo..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
                />
              </div>

              {/* Resumo */}
              {selectedTime && (
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 space-y-1.5 text-sm">
                  <p className="font-bold text-emerald-800">Resumo do agendamento</p>
                  <p className="text-emerald-700">📅 {days[selectedDay].day}, {days[selectedDay].date} às {selectedTime}</p>
                  <p className="text-emerald-700">👩‍⚕️ Dra. Carolina Matos</p>
                  <p className="text-emerald-700">{modality === 'online' ? '💻 Online' : '🏥 Presencial'}</p>
                  <p className="font-bold text-emerald-900 mt-1">R$ 150,00</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedTime}
                className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {selectedTime ? 'Confirmar Agendamento' : 'Selecione um horário'}
              </button>
              <p className="text-center text-xs text-gray-400">Sem cobranças até confirmar</p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
