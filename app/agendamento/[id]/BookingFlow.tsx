'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, Video, Users, CheckCircle } from 'lucide-react'
import { formatDateBR, formatPrice, formatTimeBR, formatWeekdayShortBR } from '@/lib/format'
import type { Modality } from '@prisma/client'

interface DayOption {
  dateStr: string
  date: Date
  times: Date[]
}

interface ProfessionalSummary {
  id: string
  name: string
  specialty: string
  price: number
  modality: Modality
  initials: string
  color: string
}

export default function BookingFlow({
  professional,
  days,
  initialHorario,
}: {
  professional: ProfessionalSummary
  days: DayOption[]
  initialHorario?: string
}) {
  const router = useRouter()

  const initialSelection = useMemo(() => {
    if (!initialHorario) return { dayIndex: 0, time: null as Date | null }
    for (let i = 0; i < days.length; i++) {
      const match = days[i].times.find((t) => t.toISOString() === initialHorario)
      if (match) return { dayIndex: i, time: match }
    }
    return { dayIndex: 0, time: null as Date | null }
  }, [days, initialHorario])

  const [selectedDay, setSelectedDay] = useState(initialSelection.dayIndex)
  const [selectedTime, setSelectedTime] = useState<Date | null>(initialSelection.time)
  const [modality, setModality] = useState<'ONLINE' | 'PRESENCIAL'>(
    professional.modality === 'PRESENCIAL' ? 'PRESENCIAL' : 'ONLINE'
  )
  const [phone, setPhone] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const canChooseModality = professional.modality === 'AMBOS'

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTime) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId: professional.id,
          scheduledAt: selectedTime.toISOString(),
          modality,
          phone: phone || undefined,
          reason: reason || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível confirmar o agendamento')
        router.refresh()
        return
      }
      setConfirmed(true)
      setTimeout(() => router.push('/patient/dashboard'), 2000)
    } finally {
      setLoading(false)
    }
  }

  if (confirmed && selectedTime) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-emerald-500" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Consulta agendada!</h2>
          <p className="text-gray-500">
            {formatDateBR(selectedTime)} às {formatTimeBR(selectedTime)} com {professional.name}
          </p>
          <p className="text-sm text-gray-400 mt-4">Redirecionando para seu painel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Coluna esquerda: calendário */}
      <div className="flex-1 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className={`w-14 h-14 ${professional.color} text-white rounded-full flex items-center justify-center text-xl font-bold shrink-0`}>
            {professional.initials}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{professional.name}</h3>
            <p className="text-sm text-gray-500">{professional.specialty}</p>
            <p className="text-sm font-bold text-emerald-600 mt-0.5">{formatPrice(professional.price)} /consulta</p>
          </div>
        </div>

        {canChooseModality && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Modalidade de atendimento</h3>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModality('ONLINE')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                  modality === 'ONLINE' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Video size={16} /> Online
              </button>
              <button
                type="button"
                onClick={() => setModality('PRESENCIAL')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                  modality === 'PRESENCIAL' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Users size={16} /> Presencial
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          {days.length === 0 ? (
            <p className="text-sm text-gray-400">Este profissional não tem horários disponíveis no momento.</p>
          ) : (
            <>
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-emerald-500" /> Próximos dias disponíveis
              </h3>
              <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
                {days.map((d, i) => (
                  <button
                    type="button"
                    key={d.dateStr}
                    onClick={() => {
                      setSelectedDay(i)
                      setSelectedTime(null)
                    }}
                    className={`shrink-0 w-16 flex flex-col items-center py-3 rounded-xl border-2 text-xs font-medium transition-colors ${
                      selectedDay === i ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-200 text-gray-600 hover:border-emerald-300'
                    }`}
                  >
                    <span>{formatWeekdayShortBR(d.date)}</span>
                    <span className="text-lg font-bold mt-0.5">{d.dateStr.slice(8, 10)}</span>
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
                    type="button"
                    key={t.toISOString()}
                    onClick={() => setSelectedTime(t)}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      selectedTime?.getTime() === t.getTime()
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-emerald-400 hover:bg-emerald-50'
                    }`}
                  >
                    {formatTimeBR(t)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Coluna direita: formulário */}
      <div className="w-full lg:w-96 shrink-0">
        <form onSubmit={handleConfirm} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900">Seus dados</h3>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">Telefone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">Motivo da consulta</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva brevemente seu objetivo..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
            />
          </div>

          {selectedTime && (
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 space-y-1.5 text-sm">
              <p className="font-bold text-emerald-800">Resumo do agendamento</p>
              <p className="text-emerald-700">📅 {formatDateBR(selectedTime)} às {formatTimeBR(selectedTime)}</p>
              <p className="text-emerald-700">👩‍⚕️ {professional.name}</p>
              <p className="text-emerald-700">{modality === 'ONLINE' ? '💻 Online' : '🏥 Presencial'}</p>
              <p className="font-bold text-emerald-900 mt-1">{formatPrice(professional.price)}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedTime || loading}
            className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Confirmando...' : selectedTime ? 'Confirmar Agendamento' : 'Selecione um horário'}
          </button>
          <p className="text-center text-xs text-gray-400">Sem cobranças até confirmar</p>
        </form>
      </div>
    </div>
  )
}
