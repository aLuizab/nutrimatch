import Link from 'next/link'
import { Users, Stethoscope, Calendar, TrendingUp, Star, ChevronRight, Clock } from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'
import { addDaysToDateString, instantAt, spDateString, startOfMonthInstant } from '@/lib/spdate'
import { formatPrice, initials, relativeTimeBR } from '@/lib/format'

export default async function AdminDashboard() {
  const admin = await requireRoleOrRedirect('ADMIN')

  const todayStr = spDateString(new Date())
  const todayStart = instantAt(todayStr, '00:00')
  const tomorrowStart = instantAt(addDaysToDateString(todayStr, 1), '00:00')
  const monthStart = startOfMonthInstant(todayStr)
  const currentMonthFirstDay = `${todayStr.slice(0, 7)}-01`
  const nextMonthFirstDay = `${addDaysToDateString(currentMonthFirstDay, 32).slice(0, 7)}-01`
  const nextMonthStart = instantAt(nextMonthFirstDay, '00:00')

  const [activeCount, pendingCount, patientCount, appointmentsToday, monthRevenue, avgRating, pendingProfessionals, recentAppointments] =
    await Promise.all([
      prisma.professional.count({ where: { status: 'ACTIVE' } }),
      prisma.professional.count({ where: { status: 'PENDING' } }),
      prisma.patient.count(),
      prisma.appointment.count({ where: { status: 'CONFIRMED', scheduledAt: { gte: todayStart, lt: tomorrowStart } } }),
      prisma.appointment.aggregate({
        _sum: { price: true },
        where: { status: 'CONFIRMED', scheduledAt: { gte: monthStart, lt: nextMonthStart } },
      }),
      prisma.professional.aggregate({ _avg: { rating: true }, where: { status: 'ACTIVE' } }),
      prisma.professional.findMany({
        where: { status: 'PENDING' },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.appointment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          professional: { include: { user: { select: { name: true } } } },
          patient: { include: { user: { select: { name: true } } } },
        },
      }),
    ])

  const stats = [
    { label: 'Profissionais ativos', value: String(activeCount), icon: Stethoscope, color: 'bg-blue-50 text-blue-600' },
    { label: 'Pacientes cadastrados', value: String(patientCount), icon: Users, color: 'bg-purple-50 text-purple-600' },
    { label: 'Consultas hoje', value: String(appointmentsToday), icon: Calendar, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Receita do mês', value: formatPrice(monthRevenue._sum.price ?? 0), icon: TrendingUp, color: 'bg-yellow-50 text-yellow-600' },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <AdminSidebar name={admin.name} />

      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-100 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900">Painel administrativo</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral da plataforma</p>
        </div>

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
                <h2 className="text-base font-bold text-gray-900">Agendamentos recentes</h2>
                <Link href="/admin/agendamentos" className="flex items-center gap-1 text-xs text-emerald-600 font-medium hover:underline">
                  Ver todos <ChevronRight size={14} />
                </Link>
              </div>
              {recentAppointments.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum agendamento ainda.</p>
              ) : (
                <div className="space-y-3">
                  {recentAppointments.map((a) => (
                    <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100">
                      <div className="w-9 h-9 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        {initials(a.professional.user.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {a.patient.user.name} <span className="text-gray-400 font-normal">com</span> {a.professional.user.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{relativeTimeBR(a.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">{formatPrice(a.price)}</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            a.status === 'CANCELLED' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          {a.status === 'CANCELLED' ? 'Cancelada' : 'Confirmada'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="bg-emerald-500 rounded-2xl p-5 text-white">
                <p className="text-xs font-bold text-emerald-200 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Star size={13} /> Avaliação média da plataforma
                </p>
                <p className="text-3xl font-bold">{(avgRating._avg.rating ?? 0).toFixed(1)}</p>
                <p className="text-emerald-200 text-sm mt-0.5">entre profissionais ativos</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Clock size={14} className="text-yellow-500" /> Aguardando aprovação
                  </h3>
                  <Link href="/admin/profissionais" className="text-xs text-emerald-600 font-medium hover:underline">
                    Ver todos
                  </Link>
                </div>
                {pendingCount === 0 ? (
                  <p className="text-sm text-gray-400">Nenhum profissional pendente.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingProfessionals.map((p) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {initials(p.user.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.user.name}</p>
                          <p className="text-xs text-gray-500">{p.specialty}</p>
                        </div>
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
