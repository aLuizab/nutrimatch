import ProfessionalSidebar from '../components/ProfessionalSidebar'
import AgendaGrid from './AgendaGrid'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'

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
  }))

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <ProfessionalSidebar name={user.name} crn={user.professional.crn} />

      <main className="flex-1 overflow-auto">
        <AgendaGrid appointments={appointments} />
      </main>
    </div>
  )
}
