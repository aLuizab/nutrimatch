'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, Video, Users, CheckCircle } from 'lucide-react'
import { formatDateBR, formatPrice, formatTimeBR, formatWeekdayShortBR } from '@/lib/format'
import { RESCHEDULE_CUTOFF_HOURS } from '@/lib/appointment-status'
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

interface ProgramSummary {
  price: number
  consultationNumber: number
  total: number
}

interface RescheduleTarget {
  appointmentId: string
  oldDateLabel: string
  oldTimeLabel: string
}

export default function BookingFlow({
  professional,
  program,
  paymentRequired,
  days,
  initialHorario,
  reschedule,
}: {
  professional: ProfessionalSummary
  program: ProgramSummary | null
  paymentRequired: boolean
  days: DayOption[]
  initialHorario?: string
  reschedule?: RescheduleTarget | null
}) {
  const router = useRouter()
  const displayPrice = program ? program.price : professional.price

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
  const [redirecting, setRedirecting] = useState(false)
  const [chargedPrice, setChargedPrice] = useState<number | null>(null)

  const canChooseModality = professional.modality === 'AMBOS'

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTime) return
    setError(null)
    setLoading(true)
    try {
      // Remarcação: mesmo horário, mesma consulta, PATCH em vez de criar um agendamento novo —
      // não passa por pagamento nem confirmação de novo, só o horário muda.
      const res = reschedule
        ? await fetch(`/api/appointments/${reschedule.appointmentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reschedule: selectedTime.toISOString() }),
          })
        : await fetch('/api/appointments', {
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
        setError(data.error ?? (reschedule ? 'Não foi possível remarcar a consulta' : 'Não foi possível confirmar o agendamento'))
        router.refresh()
        return
      }
      if (reschedule) {
        setConfirmed(true)
        setTimeout(() => router.push('/patient/consultas'), 3000)
        return
      }
      // O pagamento é o que garante o horário, então o navegador sai daqui para a tela de
      // Pix. `redirecting` mantém o botão desabilitado durante a navegação — sem ele, o
      // `finally` abaixo reabilitaria a tempo de um segundo clique criar outro agendamento
      // no mesmo horário.
      if (data.paymentRequired && data.paymentUrl) {
        setRedirecting(true)
        window.location.href = data.paymentUrl
        return
      }
      setChargedPrice(typeof data.price === 'number' ? data.price : null)
      setConfirmed(true)
      setTimeout(() => router.push('/patient/dashboard'), 3000)
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {reschedule ? 'Consulta remarcada!' : 'Consulta agendada!'}
          </h2>
          <p className="text-gray-500">
            {formatDateBR(selectedTime)} às {formatTimeBR(selectedTime)} com {professional.name}
          </p>
          {!reschedule && chargedPrice !== null && (
            <>
              <p className="text-gray-900 font-bold mt-2">{formatPrice(chargedPrice)}</p>
              {/* The program price can stop applying between render and submit (last slot taken,
                  program expired). Never let that change silently. */}
              {chargedPrice !== displayPrice && (
                <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-2.5 mt-3 max-w-sm mx-auto">
                  O valor do programa não se aplicou a esta consulta e ela foi agendada pelo valor
                  avulso.
                </p>
              )}
            </>
          )}
          <p className="text-sm text-gray-400 mt-4">
            {reschedule ? 'Redirecionando para Minhas Consultas...' : 'Redirecionando para seu painel...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Coluna esquerda: calendário */}
      <div className="flex-1 space-y-6">
        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className={`w-14 h-14 ${professional.color} text-white rounded-full flex items-center justify-center text-xl font-bold shrink-0`}>
            {professional.initials}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{professional.name}</h3>
            <p className="text-sm text-gray-500">{professional.specialty}</p>
            <p className="text-sm font-bold text-emerald-600 mt-0.5">
              {formatPrice(displayPrice)} /consulta
              {program && (
                <span className="text-gray-400 font-normal line-through ml-2">{formatPrice(professional.price)}</span>
              )}
            </p>
            {program && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5 mt-1.5 inline-block">
                Consulta {program.consultationNumber} de {program.total} do seu programa
              </p>
            )}
          </div>
        </div>

        {!reschedule && canChooseModality && (
          <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
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

        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
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
        <form onSubmit={handleConfirm} className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900">{reschedule ? 'Novo horário' : 'Seus dados'}</h3>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          {!reschedule && (
            <>
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
            </>
          )}

          {selectedTime && (
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 space-y-1.5 text-sm">
              <p className="font-bold text-emerald-800">
                {reschedule ? 'Novo horário' : 'Resumo do agendamento'}
              </p>
              <p className="text-emerald-700">📅 {formatDateBR(selectedTime)} às {formatTimeBR(selectedTime)}</p>
              <p className="text-emerald-700">👩‍⚕️ {professional.name}</p>
              {reschedule ? (
                <p className="text-emerald-700">💳 Sem cobrança nova — só o horário muda.</p>
              ) : (
                <>
                  <p className="text-emerald-700">{modality === 'ONLINE' ? '💻 Online' : '🏥 Presencial'}</p>
                  <p className="font-bold text-emerald-900 mt-1">{formatPrice(displayPrice)}</p>
                </>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedTime || loading || redirecting}
            className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {redirecting
              ? 'Abrindo pagamento...'
              : loading
                ? reschedule
                  ? 'Remarcando...'
                  : 'Confirmando...'
                : !selectedTime
                  ? 'Selecione um horário'
                  : reschedule
                    ? 'Confirmar novo horário'
                    : paymentRequired
                      ? 'Ir para o pagamento'
                      : 'Confirmar Agendamento'}
          </button>
          {reschedule ? (
            <p className="text-center text-xs text-gray-400 leading-relaxed">
              Você pode remarcar até {RESCHEDULE_CUTOFF_HOURS} horas antes do horário original.
              Depois disso, ainda dá para cancelar em Minhas Consultas.
            </p>
          ) : (
            <>
              {/* The distinction the patient most needs, and it differs by method: card reserves
                  now and charges later, Pix charges immediately and is refunded if declined.
                  Saying "sem cobranças" alone would be false for Pix, and describing only the
                  card's hold would be misleading for whoever pays with the other one. */}
              <p className="text-center text-xs text-gray-400 leading-relaxed">
                {program
                  ? 'Esta consulta já está paga no seu pacote.'
                  : paymentRequired
                    ? 'No cartão, o valor fica reservado e só é cobrado quando o profissional confirmar. No Pix, o valor é debitado na hora e devolvido automaticamente se o profissional não confirmar.'
                    : 'Sem cobranças até confirmar'}
              </p>
              {paymentRequired && !program && (
                <p className="text-center text-xs text-gray-400">
                  <a href="/politica-de-cancelamento" target="_blank" className="underline hover:text-gray-600">
                    Veja a política completa de cancelamento e reembolso
                  </a>
                </p>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  )
}
