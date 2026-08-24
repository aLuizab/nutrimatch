import Link from 'next/link'
import { Repeat, Users, CalendarClock, AlertCircle } from 'lucide-react'
import DashboardShell from '../components/DashboardShell'
import ProfessionalSidebar from '../components/ProfessionalSidebar'
import ProgramasClient, { type PlanRow } from './ProgramasClient'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'
import { avatarColor, formatDateBR, formatPrice, initials } from '@/lib/format'

export default async function Programas() {
  const user = await requireRoleOrRedirect('PROFESSIONAL')
  if (!user.professional) return null
  const professionalId = user.professional.id
  const now = new Date()

  const [planRows, enrollmentRows] = await Promise.all([
    prisma.carePlan.findMany({
      where: { professionalId },
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
      include: { _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } } },
    }),
    prisma.enrollment.findMany({
      where: { professionalId, status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' },
      include: {
        carePlan: { select: { name: true } },
        patient: { include: { user: { select: { name: true } } } },
        // Filtered relation count in the same query — a count() per row would be an N+1.
        _count: { select: { appointments: { where: { status: 'CONFIRMED' } } } },
      },
    }),
  ])

  const plans: PlanRow[] = planRows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    durationMonths: p.durationMonths,
    consultations: p.consultations,
    pricePerConsultation: p.pricePerConsultation,
    active: p.active,
    activeEnrollments: p._count.enrollments,
  }))

  const enrollments = enrollmentRows.map((e) => {
    const used = e._count.appointments
    const remaining = Math.max(0, e.consultations - used)
    const daysLeft = Math.ceil((e.endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return {
      id: e.id,
      patientName: e.patient.user.name,
      patientId: e.patientId,
      planName: e.carePlan.name,
      used,
      total: e.consultations,
      remaining,
      daysLeft,
      endsAtLabel: formatDateBR(e.endsAt),
      // Unused consultations running out of time is the nudge worth surfacing.
      atRisk: daysLeft <= 30 && remaining > 0,
    }
  })

  const activePlans = plans.filter((p) => p.active).length
  const remainingTotal = enrollments.reduce((sum, e) => sum + e.remaining, 0)
  const expectedValue = enrollmentRows.reduce(
    (sum, e) => sum + Math.max(0, e.consultations - e._count.appointments) * e.pricePerConsultation,
    0
  )

  const stats = [
    { label: 'Programas ativos', value: String(activePlans), icon: Repeat, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pacientes em acompanhamento', value: String(enrollments.length), icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Consultas ainda não realizadas', value: String(remainingTotal), icon: CalendarClock, color: 'bg-purple-50 text-purple-600' },
  ]

  return (
    <DashboardShell sidebar={<ProfessionalSidebar name={user.name} crn={user.professional.crn} />}>
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Programas de acompanhamento</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Transforme consultas avulsas em acompanhamento contínuo
        </p>
      </div>

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        {expectedValue > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500">Valor previsto dos programas ativos</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatPrice(expectedValue)}</p>
            <p className="text-xs text-gray-400 mt-1.5">
              Consultas contratadas e ainda não realizadas. O pagamento é combinado diretamente com
              o paciente — a NutriMatch não processa pagamentos.
            </p>
          </div>
        )}

        <ProgramasClient plans={plans} listPrice={user.professional.price} />

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-1">Pacientes em acompanhamento</h2>
          <p className="text-xs text-gray-500 mb-5">Progresso de cada paciente dentro do programa</p>

          {enrollments.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">
              Nenhum paciente em acompanhamento ainda. Seus programas ativos aparecem no seu perfil
              público para os pacientes aderirem.
            </p>
          ) : (
            <div className="space-y-3">
              {enrollments.map((e) => (
                <div key={e.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl flex-wrap">
                  <div className={`w-10 h-10 ${avatarColor(e.patientId)} text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0`}>
                    {initials(e.patientName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/pacientes/${e.patientId}`} className="font-medium text-gray-900 hover:text-emerald-600 transition-colors">
                      {e.patientName}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">{e.planName} · até {e.endsAtLabel}</p>
                  </div>
                  <div className="w-40 shrink-0">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{e.used} de {e.total}</span>
                      <span>{e.daysLeft > 0 ? `${e.daysLeft}d` : 'encerrado'}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, (e.used / e.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                  {e.atRisk && (
                    <span className="flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-100 px-2 py-1 rounded-full shrink-0">
                      <AlertCircle size={12} /> {e.remaining} sem agendar
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
