import AdminSidebar from '../../components/AdminSidebar'
import AgendamentosTable from './AgendamentosTable'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'
import { appointmentDisplayStatus, formatDateBR, formatTimeBR } from '@/lib/format'
import DashboardShell from '../../components/DashboardShell'

export default async function AdminAgendamentos() {
  const admin = await requireRoleOrRedirect('ADMIN')

  const rows = await prisma.appointment.findMany({
    orderBy: { scheduledAt: 'desc' },
    take: 200,
    include: {
      professional: { include: { user: { select: { name: true } } } },
      patient: { include: { user: { select: { name: true } } } },
    },
  })

  const appointments = rows.map((a) => ({
    id: a.id,
    professionalName: a.professional.user.name,
    patientName: a.patient.user.name,
    scheduledAtLabel: `${formatDateBR(a.scheduledAt)} às ${formatTimeBR(a.scheduledAt)}`,
    modality: a.modality,
    price: a.price,
    status: a.status,
    displayStatus: appointmentDisplayStatus(a.scheduledAt, a.status),
  }))

  return (
    <DashboardShell sidebar={<AdminSidebar name={admin.name} />}>
      <div className="bg-surface border-b border-gray-100 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Agendamentos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Todas as consultas da plataforma</p>
      </div>

      <div className="p-8">
        <AgendamentosTable appointments={appointments} />
      </div>
    </DashboardShell>
  )
}
