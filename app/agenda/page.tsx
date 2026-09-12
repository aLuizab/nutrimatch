import ProfessionalSidebar from '../components/ProfessionalSidebar'
import AgendaGrid from './AgendaGrid'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'
import { isMeetingOpen, meetingUrl } from '@/lib/meeting'
import DashboardShell from '../components/DashboardShell'

export default async function Agenda() {
  const user = await requireRoleOrRedirect('PROFESSIONAL')
  if (!user.professional) return null

  const rows = await prisma.appointment.findMany({
    // Includes awaiting bookings: the agenda is where the professional acts on them.
    where: { professionalId: user.professional.id, status: { in: ['CONFIRMED', 'AWAITING_CONFIRMATION'] } },
    include: { patient: { include: { user: { select: { name: true } } } } },
  })

  const appointments = rows.map((a) => ({
    id: a.id,
    scheduledAt: a.scheduledAt,
    patientName: a.patient.user.name,
    reason: a.reason,
    modality: a.modality,
    summary: a.summary,
    status: a.status as 'CONFIRMED' | 'AWAITING_CONFIRMATION',
    confirmationDeadline: a.confirmationDeadline,
    meetingUrl: a.meetingRoom ? meetingUrl(a.meetingRoom) : null,
    meetingOpen: a.meetingRoom != null && isMeetingOpen(a.scheduledAt),
    attendance: a.attendance,
  }))

  return (
    <DashboardShell sidebar={<ProfessionalSidebar name={user.name} crn={user.professional.crn} />}>
      <AgendaGrid appointments={appointments} />
    </DashboardShell>
  )
}
