import PatientSidebar from '../../components/PatientSidebar'
import PatientConsultasClient, { type ConsultaRow } from './PatientConsultasClient'
import { prisma } from '@/lib/prisma'
import { requirePatientProfileOrRedirect } from '@/lib/session'
import { formatDateBR, formatTimeBR } from '@/lib/format'
import { specialtyLabel } from '@/lib/specialties'
import { isMeetingOpen, meetingUrl, minutesUntilOpen } from '@/lib/meeting'
import { isWithinCancelRefundWindow, isWithinRescheduleWindow } from '@/lib/appointment-status'
import DashboardShell from '../../components/DashboardShell'

export default async function MinhasConsultas() {
  const user = await requirePatientProfileOrRedirect()
  if (!user.patient) return null
  const patientId = user.patient.id
  const now = new Date()

  const include = {
    professional: { include: { user: { select: { name: true } } } },
    review: { select: { rating: true } },
  } as const

  const [upcomingRows, pastRows] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId, status: { in: ['CONFIRMED', 'AWAITING_CONFIRMATION'] }, scheduledAt: { gt: now } },
      orderBy: { scheduledAt: 'asc' },
      include,
    }),
    prisma.appointment.findMany({
      where: { patientId, OR: [{ scheduledAt: { lte: now } }, { status: 'CANCELLED' }] },
      orderBy: { scheduledAt: 'desc' },
      include,
    }),
  ])

  const toRow = (a: (typeof upcomingRows)[number]): ConsultaRow => ({
    id: a.id,
    professionalId: a.professionalId,
    professionalName: a.professional.user.name,
    specialty: specialtyLabel(a.professional.specialties),
    dateLabel: formatDateBR(a.scheduledAt),
    timeLabel: formatTimeBR(a.scheduledAt),
    modality: a.modality,
    reason: a.reason,
    status: a.status,
    summary: a.summary,
    meetingUrl: a.meetingRoom ? meetingUrl(a.meetingRoom) : null,
    meetingOpen: a.meetingRoom != null && isMeetingOpen(a.scheduledAt, now),
    minutesUntilMeeting: minutesUntilOpen(a.scheduledAt, now),
    myRating: a.review?.rating ?? null,
    canReview: a.status === 'CONFIRMED' && a.scheduledAt <= now && !a.review,
    // Só uma consulta CONFIRMED e paga tem reembolso em jogo ao cancelar — ver a rota de
    // cancelamento para as duas janelas (paciente vs. profissional cancelando).
    refundsIfCancelledNow: a.status === 'CONFIRMED' && a.paymentStatus === 'PAID' && isWithinCancelRefundWindow(a.scheduledAt, now),
    canReschedule: a.status === 'CONFIRMED' && isWithinRescheduleWindow(a.scheduledAt, now),
    attendance: a.attendance,
  })

  return (
    <DashboardShell sidebar={<PatientSidebar name={user.name} primaryRole={user.role} />}>
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Minhas Consultas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie seus agendamentos e histórico</p>
      </div>

      <div className="p-8">
        <PatientConsultasClient upcoming={upcomingRows.map(toRow)} past={pastRows.map(toRow)} />
      </div>
    </DashboardShell>
  )
}
