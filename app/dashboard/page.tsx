import Link from 'next/link'
import { Users, Calendar, TrendingUp, Star, Clock, ChevronRight, Bell, Video, MapPin } from 'lucide-react'
import ProfessionalSidebar from '../components/ProfessionalSidebar'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'
import { addDaysToDateString, instantAt, spDateString, startOfMonthInstant } from '@/lib/spdate'
import { appointmentDisplayStatus, avatarColor, formatDateBR, formatPrice, formatTimeBR, initials } from '@/lib/format'

export default async function DashboardProfissional() {
  const user = await requireRoleOrRedirect('PROFESSIONAL')
  if (!user.professional) return null
  const professionalId = user.professional.id

  const todayStr = spDateString(new Date())
  const todayStart = instantAt(todayStr, '00:00')
  const tomorrowStart = instantAt(addDaysToDateString(todayStr, 1), '00:00')
  const monthStart = startOfMonthInstant(todayStr)
  const nextMonthFirstDay = `${addDaysToDateString(`${todayStr.slice(0, 7)}-01`, 32).slice(0, 7)}-01`
  const nextMonthStart = instantAt(nextMonthFirstDay, '00:00')

  const [allAppointments, todayAppointments, monthRevenue] = await Promise.all([
    prisma.appointment.findMany({
      where: { professionalId, status: 'CONFIRMED' },
      include: { patient: { include: { user: { select: { name: true } } } } },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.appointment.findMany({
      where: { professionalId, status: 'CONFIRMED', scheduledAt: { gte: todayStart, lt: tomorrowStart } },
      include: { patient: { include: { user: { select: { name: true } } } } },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.appointment.aggregate({
      _sum: { price: true },
      where: { professionalId, status: 'CONFIRMED', scheduledAt: { gte: monthStart, lt: nextMonthStart } },
    }),
  ])

  const now = new Date()
  const activePatients = new Set(
    allAppointments
      .filter((a) => a.scheduledAt > now || a.scheduledAt >= new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000))
      .map((a) => a.patientId)
  )
  const nextAppointment = allAppointments.find((a) => a.scheduledAt > now) ?? null
  const recentPatientsMap = new Map<string, (typeof allAppointments)[number]>()
  for (const a of [...allAppointments].reverse()) {
    if (a.scheduledAt <= now) recentPatientsMap.set(a.patientId, a)
  }
  const recentPatients = Array.from(recentPatientsMap.values())
    .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())
    .slice(0, 3)

  const stats = [
    { label: 'Pacientes ativos', value: String(activePatients.size), icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Consultas hoje', value: String(todayAppointments.length), icon: Calendar, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Receita mensal', value: formatPrice(monthRevenue._sum.price ?? 0), icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
    { label: 'Avaliação média', value: user.professional.rating.toFixed(1), icon: Star, color: 'bg-yellow-50 text-yellow-600' },
  ]

  const todayName = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(now)

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <ProfessionalSidebar name={user.name} crn={user.professional.crn} />

      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-100 px-8 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Olá, {user.name.split(' ')[0]}! 👋</h1>
            <p className="text-sm text-gray-500 mt-0.5 capitalize">{todayName}</p>
          </div>
          <button className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>

        {user.professional.status === 'PENDING' && (
          <div className="mx-8 mt-6 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
            Seu perfil está em análise e ainda não aparece nas buscas.
          </div>
        )}

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color} mb-3`}>
                  <s.icon size={20} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-base font-bold text-gray-900">Agenda de hoje</h2>
                <Link href="/agenda" className="flex items-center gap-1 text-xs text-emerald-600 font-medium hover:underline">
                  Ver agenda completa <ChevronRight size={14} />
                </Link>
              </div>
              {todayAppointments.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma consulta agendada para hoje.</p>
              ) : (
                <div className="space-y-3">
                  {todayAppointments.map((a) => {
                    const displayStatus = appointmentDisplayStatus(a.scheduledAt, a.status)
                    return (
                      <div
                        key={a.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border ${
                          displayStatus === 'proximo' ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-white'
                        }`}
                      >
                        <div className="text-center w-12 shrink-0">
                          <p className="text-base font-bold text-gray-900">{formatTimeBR(a.scheduledAt)}</p>
                        </div>
                        <div className="w-px h-8 bg-gray-200 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{a.patient.user.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{a.reason ?? 'Consulta'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium ${
                            a.modality === 'ONLINE' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {a.modality === 'ONLINE' ? <Video size={11} /> : <MapPin size={11} />}
                            {a.modality === 'ONLINE' ? 'online' : 'presencial'}
                          </span>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            displayStatus === 'concluido' ? 'bg-gray-100 text-gray-500' :
                            displayStatus === 'proximo' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-yellow-50 text-yellow-700'
                          }`}>
                            {displayStatus === 'concluido' ? 'Concluído' : displayStatus === 'proximo' ? 'Em breve' : 'Agendado'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-5">
              {nextAppointment && (
                <div className="bg-emerald-500 rounded-2xl p-5 text-white">
                  <p className="text-xs font-bold text-emerald-200 uppercase tracking-widest mb-3">Próxima consulta</p>
                  <p className="text-xl font-bold">{formatTimeBR(nextAppointment.scheduledAt)}</p>
                  <p className="font-medium mt-0.5">{nextAppointment.patient.user.name}</p>
                  <p className="text-emerald-200 text-sm mt-0.5">
                    {nextAppointment.reason ?? 'Consulta'} · {nextAppointment.modality === 'ONLINE' ? 'Online' : 'Presencial'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-3 text-emerald-100 text-xs">
                    <Clock size={13} /> {formatDateBR(nextAppointment.scheduledAt)}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-gray-900">Pacientes recentes</h3>
                  <Link href="/pacientes" className="text-xs text-emerald-600 font-medium hover:underline">Ver todos</Link>
                </div>
                {recentPatients.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhum paciente ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {recentPatients.map((a) => (
                      <div key={a.patientId} className="flex items-center gap-3">
                        <div className={`w-9 h-9 ${avatarColor(a.patientId)} text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0`}>
                          {initials(a.patient.user.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{a.patient.user.name}</p>
                          <p className="text-xs text-gray-500">{a.reason ?? 'Consulta'}</p>
                        </div>
                        <p className="text-xs text-gray-400 shrink-0">{formatDateBR(a.scheduledAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
