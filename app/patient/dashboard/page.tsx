import Link from 'next/link'
import { Calendar, Video, MapPin, Star, Clock, ChevronRight, Bell } from 'lucide-react'
import PatientSidebar from '../../components/PatientSidebar'
import PatientQuickSearch from './PatientQuickSearch'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'
import { PROFESSIONAL_CARD_INCLUDE, toProfessionalCard } from '@/lib/professionals'
import { avatarColor, formatDateBR, formatTimeBR, initials } from '@/lib/format'

export default async function PatientDashboard() {
  const user = await requireRoleOrRedirect('PATIENT')
  if (!user.patient) return null
  const patientId = user.patient.id

  const now = new Date()

  const [nextAppointment, pastAppointments, suggestionsRows] = await Promise.all([
    prisma.appointment.findFirst({
      where: { patientId, status: 'CONFIRMED', scheduledAt: { gt: now } },
      orderBy: { scheduledAt: 'asc' },
      include: { professional: { include: { user: { select: { name: true } } } } },
    }),
    prisma.appointment.findMany({
      where: { patientId, status: 'CONFIRMED', scheduledAt: { lte: now } },
      orderBy: { scheduledAt: 'desc' },
      take: 2,
      include: { professional: { include: { user: { select: { name: true } } } } },
    }),
    prisma.professional.findMany({
      where: { status: 'ACTIVE' },
      include: PROFESSIONAL_CARD_INCLUDE,
      orderBy: { rating: 'desc' },
      take: 3,
    }),
  ])

  const suggestions = suggestionsRows.map(toProfessionalCard)
  const todayName = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(now)

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <PatientSidebar name={user.name} />

      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-100 px-8 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Olá, {user.name.split(' ')[0]}! 👋</h1>
            <p className="text-sm text-gray-500 mt-0.5 capitalize">{todayName}</p>
          </div>
          <button className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {nextAppointment ? (
            <div className="bg-emerald-500 rounded-2xl p-6 text-white">
              <p className="text-xs font-bold text-emerald-200 uppercase tracking-widest mb-4">Próxima consulta</p>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 text-white rounded-full flex items-center justify-center text-lg font-bold">
                    {initials(nextAppointment.professional.user.name)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{nextAppointment.professional.user.name}</h3>
                    <p className="text-emerald-200 text-sm">{nextAppointment.professional.specialty}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-emerald-100 text-sm">
                      <span className="flex items-center gap-1.5"><Calendar size={13} /> {formatDateBR(nextAppointment.scheduledAt)}</span>
                      <span className="flex items-center gap-1.5"><Clock size={13} /> {formatTimeBR(nextAppointment.scheduledAt)}</span>
                      <span className="flex items-center gap-1.5">
                        {nextAppointment.modality === 'ONLINE' ? <Video size={13} /> : <MapPin size={13} />}
                        {nextAppointment.modality === 'ONLINE' ? 'Online' : 'Presencial'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href="/patient/consultas" className="bg-white text-emerald-600 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors">
                    Ver detalhes
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <p className="text-sm text-gray-500">Você não tem nenhuma consulta agendada.</p>
              <Link href="/resultados" className="inline-block mt-3 text-emerald-600 text-sm font-medium border border-emerald-200 px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors">
                Buscar nutricionista
              </Link>
            </div>
          )}

          <PatientQuickSearch />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-base font-bold text-gray-900">Recomendados para você</h2>
                <Link href="/resultados" className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1">
                  Ver todos <ChevronRight size={13} />
                </Link>
              </div>
              <div className="space-y-4">
                {suggestions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${s.color} text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0`}>
                      {s.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-500">{s.specialty}</p>
                        <span className="flex items-center gap-0.5 text-xs text-gray-500">
                          <Star size={11} className="text-yellow-400 fill-yellow-400" /> {s.rating}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">R$ {s.price}</p>
                      <Link href={`/perfil/${s.id}`} className="text-xs text-emerald-600 hover:underline">Ver perfil</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-base font-bold text-gray-900">Histórico recente</h2>
                <Link href="/patient/consultas" className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1">
                  Ver todas <ChevronRight size={13} />
                </Link>
              </div>
              {pastAppointments.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma consulta realizada ainda.</p>
              ) : (
                <div className="space-y-4">
                  {pastAppointments.map((h) => (
                    <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className={`w-10 h-10 ${avatarColor(h.professionalId)} text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0`}>
                        {initials(h.professional.user.name)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{h.professional.user.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{h.reason ?? 'Consulta'} · {formatDateBR(h.scheduledAt)}</p>
                      </div>
                      <Link
                        href={`/agendamento/${h.professionalId}`}
                        className="text-xs text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors font-medium"
                      >
                        Reagendar
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
