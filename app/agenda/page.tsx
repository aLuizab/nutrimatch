import ProfessionalSidebar from '../components/ProfessionalSidebar'
import AgendaGrid from './AgendaGrid'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'
import DashboardShell from '../components/DashboardShell'

export default async function Agenda() {
  const user = await requireRoleOrRedirect('PROFESSIONAL')
  if (!user.professional) return null

  const rows = await prisma.appointment.findMany({
    where: { professionalId: user.professional.id, status: 'CONFIRMED' },
    include: { patient: { include: { user: { select: { name: true } } } } },
  })

  const appointments = rows.map((a) => ({
    id: a.id,
    scheduledAt: a.scheduledAt,
    patientName: a.patient.user.name,
    reason: a.reason,
    modality: a.modality,
    summary: a.summary,
  }))

  return (
    <DashboardShell sidebar={<ProfessionalSidebar name={user.name} crn={user.professional.crn} />}>
      <AgendaGrid appointments={appointments} />
    </DashboardShell>
  )
}
