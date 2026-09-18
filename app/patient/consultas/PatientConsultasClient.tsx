'use client'

import { useState } from 'react'
import { OPEN_BEFORE_MINUTES } from '@/lib/meeting'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Video, MapPin, Clock, Star, FileText, X, CalendarClock } from 'lucide-react'
import { avatarColor, initials } from '@/lib/format'

export interface ConsultaRow {
  id: string
  professionalId: string
  professionalName: string
  specialty: string
  dateLabel: string
  timeLabel: string
  modality: 'ONLINE' | 'PRESENCIAL' | 'AMBOS'
  reason: string | null
  status: 'CONFIRMED' | 'CANCELLED' | 'AWAITING_CONFIRMATION' | 'EXPIRED'
  summary: string | null
  meetingUrl: string | null
  meetingOpen: boolean
  minutesUntilMeeting: number
  myRating: number | null
  canReview: boolean
  refundsIfCancelledNow: boolean
  canReschedule: boolean
  attendance: 'PENDING' | 'ATTENDED' | 'NO_SHOW' | 'CONTESTED'
}

/** Contestação de uma falta registrada pelo profissional. */
function ContestForm({ appointmentId, onDone }: { appointmentId: string; onDone: () => void }) {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!note.trim()) {
      setError('Conte o que aconteceu')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contestAttendance: note.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Não foi possível contestar')
        return
      }
      onDone()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5">{error}</div>}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Ex: eu estava na sala e o profissional não entrou..."
        rows={2}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
      />
      <button
        type="submit"
        disabled={saving}
        className="text-sm font-bold text-white bg-gray-900 px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60"
      >
        {saving ? 'Enviando...' : 'Enviar contestação'}
      </button>
    </form>
  )
}

function ReviewForm({ appointmentId, onDone }: { appointmentId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (rating === 0) {
      setError('Escolha uma nota de 1 a 5 estrelas')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, rating, comment }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível enviar sua avaliação')
        return
      }
      onDone()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 border-t border-gray-100 pt-4 space-y-3">
      <p className="text-sm font-bold text-gray-900">Avaliar consulta</p>
      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5">{error}</div>}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
            className="p-0.5"
          >
            <Star
              size={22}
              className={n <= (hovered || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Conte como foi sua experiência..."
        rows={3}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
      />
      <button
        type="submit"
        disabled={saving}
        className="bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60"
      >
        {saving ? 'Enviando...' : 'Enviar avaliação'}
      </button>
    </form>
  )
}

export default function PatientConsultasClient({ upcoming, past }: { upcoming: ConsultaRow[]; past: ConsultaRow[] }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'proximas' | 'historico'>('proximas')
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelResult, setCancelResult] = useState<{ id: string; refunded: boolean; refundedLabel: string | null } | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [contestingId, setContestingId] = useState<string | null>(null)

  async function handleCancel(id: string) {
    setCancellingId(id)
    setCancelError(null)
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCancelError(data.error ?? 'Não foi possível cancelar a consulta')
        return
      }
      setConfirmingCancelId(null)
      setCancelResult({ id, refunded: Boolean(data.refunded), refundedLabel: data.refundedLabel ?? null })
      router.refresh()
    } catch {
      setCancelError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <>
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

      {cancelError && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{cancelError}</div>
      )}
      {/* Banner de página, não por linha: a consulta cancelada some da lista "Próximas" assim
          que router.refresh() atualiza os dados, então uma mensagem presa à linha nunca chegaria
          a ser vista. */}
      {cancelResult && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <span>
            Consulta cancelada.{' '}
            {cancelResult.refunded
              ? `${cancelResult.refundedLabel} serão devolvidos ao seu método de pagamento em alguns minutos.`
              : 'Nenhum valor foi devolvido — fora da janela de reembolso ou nada havia sido cobrado.'}
          </span>
          <button onClick={() => setCancelResult(null)} className="text-emerald-500 hover:text-emerald-700 shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {activeTab === 'proximas' && (
        <div className="space-y-4">
          {upcoming.map((appt) => (
            <div key={appt.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
              <div className="flex items-start gap-4 flex-wrap">
                <div className={`w-14 h-14 ${avatarColor(appt.professionalId)} text-white rounded-full flex items-center justify-center text-lg font-bold shrink-0`}>
                  {initials(appt.professionalName)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900">{appt.professionalName}</h3>
                  <p className="text-sm text-gray-500">{appt.specialty} · {appt.reason ?? 'Consulta'}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5"><Calendar size={14} className="text-emerald-500" /> {appt.dateLabel}</span>
                    <span className="flex items-center gap-1.5"><Clock size={14} className="text-emerald-500" /> {appt.timeLabel}</span>
                    <span className="flex items-center gap-1.5">
                      {appt.modality === 'ONLINE' ? <Video size={14} className="text-blue-500" /> : <MapPin size={14} className="text-emerald-500" />}
                      {appt.modality === 'ONLINE' ? 'Online' : 'Presencial'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {appt.status === 'AWAITING_CONFIRMATION' && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full">
                      <Clock size={11} /> Aguardando confirmação
                    </span>
                  )}
                  <div className="flex gap-2">
                  {appt.status === 'CONFIRMED' && appt.canReschedule && (
                    <Link
                      href={`/agendamento/${appt.professionalId}?remarcar=${appt.id}`}
                      className="flex items-center gap-1.5 text-sm font-medium text-gray-600 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <CalendarClock size={14} /> Remarcar
                    </Link>
                  )}
                  <button
                    disabled={cancellingId === appt.id}
                    onClick={() =>
                      // Sem prejuízo em jogo antes da confirmação (ver a rota de cancelamento) —
                      // só a consulta já confirmada tem um "sem reembolso" possível, e é aí que
                      // vale parar para confirmar antes de agir.
                      appt.status === 'CONFIRMED' ? setConfirmingCancelId(appt.id) : handleCancel(appt.id)
                    }
                    className="text-sm font-medium text-red-500 border border-red-100 px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {cancellingId === appt.id ? 'Cancelando...' : 'Cancelar'}
                  </button>
                  {appt.modality === 'ONLINE' && appt.status === 'CONFIRMED' && appt.meetingUrl && (
                    appt.meetingOpen ? (
                      <a
                        href={appt.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm font-bold text-white bg-emerald-500 px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
                      >
                        <Video size={14} /> Entrar na consulta
                      </a>
                    ) : (
                      <span
                        title={`A sala abre ${OPEN_BEFORE_MINUTES} minutos antes do horário`}
                        className="text-sm font-medium text-gray-400 border border-gray-200 px-4 py-2.5 rounded-xl cursor-default"
                      >
                        {appt.minutesUntilMeeting > 60
                          ? 'Sala abre no dia'
                          : `Abre em ${appt.minutesUntilMeeting}min`}
                      </span>
                    )
                  )}
                  </div>
                </div>
              </div>

              {confirmingCancelId === appt.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50/60 -mx-6 -mb-6 px-6 py-4 rounded-b-2xl">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {appt.refundsIfCancelledNow
                      ? 'Você está dentro do prazo de reembolso: o valor pago será devolvido integralmente.'
                      : 'Fora do prazo de reembolso — cancelar agora não devolve o valor pago.'}
                    {appt.canReschedule && !appt.refundsIfCancelledNow && ' Prefere remarcar em vez de cancelar?'}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setConfirmingCancelId(null)}
                      className="text-sm font-medium text-gray-600 px-4 py-2 rounded-lg hover:bg-white transition-colors"
                    >
                      Voltar
                    </button>
                    {appt.canReschedule && !appt.refundsIfCancelledNow && (
                      <Link
                        href={`/agendamento/${appt.professionalId}?remarcar=${appt.id}`}
                        className="text-sm font-medium text-gray-700 border border-gray-200 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Remarcar
                      </Link>
                    )}
                    <button
                      onClick={() => handleCancel(appt.id)}
                      disabled={cancellingId === appt.id}
                      className="text-sm font-bold text-white bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60"
                    >
                      {cancellingId === appt.id ? 'Cancelando...' : 'Confirmar cancelamento'}
                    </button>
                  </div>
                </div>
              )}
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
                <div className={`w-14 h-14 ${avatarColor(appt.professionalId)} text-white rounded-full flex items-center justify-center text-lg font-bold shrink-0`}>
                  {initials(appt.professionalName)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900">{appt.professionalName}</h3>
                  <p className="text-sm text-gray-500">{appt.specialty} · {appt.reason ?? 'Consulta'}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5"><Calendar size={14} /> {appt.dateLabel}</span>
                    <span className="flex items-center gap-1.5"><Clock size={14} /> {appt.timeLabel}</span>
                    <span className="flex items-center gap-1.5">
                      {appt.modality === 'ONLINE' ? <Video size={14} /> : <MapPin size={14} />}
                      {appt.modality === 'ONLINE' ? 'Online' : 'Presencial'}
                    </span>
                    {appt.status === 'CANCELLED' && (
                      <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Cancelada</span>
                    )}
                    {appt.myRating !== null && (
                      <span className="flex items-center gap-1 text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                        <Star size={11} className="fill-yellow-400 text-yellow-400" /> Sua nota: {appt.myRating}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {appt.canReview && (
                    <button
                      onClick={() => setReviewingId(reviewingId === appt.id ? null : appt.id)}
                      className="text-sm font-medium text-yellow-600 border border-yellow-200 px-4 py-2.5 rounded-xl hover:bg-yellow-50 transition-colors flex items-center gap-1.5"
                    >
                      <Star size={14} /> Avaliar
                    </button>
                  )}
                  <Link href={`/agendamento/${appt.professionalId}`} className="text-sm font-bold text-white bg-emerald-500 px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors">
                    Reagendar
                  </Link>
                </div>
              </div>

              {appt.attendance === 'NO_SHOW' && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-bold text-amber-900">Falta registrada nesta consulta</p>
                  <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                    O profissional registrou que você não compareceu. Faltas limitam quantas
                    consultas você mantém agendadas ao mesmo tempo — nenhum profissional vê essa
                    informação. Se foi um engano, conte o que aconteceu:
                  </p>
                  {contestingId === appt.id ? (
                    <ContestForm
                      appointmentId={appt.id}
                      onDone={() => {
                        setContestingId(null)
                        router.refresh()
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => setContestingId(appt.id)}
                      className="mt-2 text-sm font-medium text-amber-900 underline hover:no-underline"
                    >
                      Contestar esta falta
                    </button>
                  )}
                </div>
              )}
              {appt.attendance === 'CONTESTED' && (
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-sm text-gray-700">
                    Sua contestação foi registrada. Enquanto isso, esta falta não conta no seu
                    histórico.
                  </p>
                </div>
              )}

              {appt.summary && (
                <div className="mt-4 bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1.5">
                    <FileText size={13} /> Resumo da consulta
                  </p>
                  <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-line">{appt.summary}</p>
                </div>
              )}

              {reviewingId === appt.id && (
                <ReviewForm
                  appointmentId={appt.id}
                  onDone={() => {
                    setReviewingId(null)
                    router.refresh()
                  }}
                />
              )}
            </div>
          ))}

          {past.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-400 font-medium">Nenhuma consulta no histórico</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
