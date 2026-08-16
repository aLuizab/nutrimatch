import PatientSidebar from '../../components/PatientSidebar'
import PatientConsultasClient, { type ConsultaRow } from './PatientConsultasClient'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'
import { formatDateBR, formatTimeBR } from '@/lib/format'

export default async function MinhasConsultas() {
  const user = await requireRoleOrRedirect('PATIENT')
  if (!user.patient) return null
  const patientId = user.patient.id
  const now = new Date()

  const [upcomingRows, pastRows] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId, status: 'CONFIRMED', scheduledAt: { gt: now } },
      orderBy: { scheduledAt: 'asc' },
      include: { professional: { include: { user: { select: { name: true } } } } },
    }),
    prisma.appointment.findMany({
      where: { patientId, OR: [{ scheduledAt: { lte: now } }, { status: 'CANCELLED' }] },
      orderBy: { scheduledAt: 'desc' },
      include: { professional: { include: { user: { select: { name: true } } } } },
    }),
  ])

  const toRow = (a: (typeof upcomingRows)[number]): ConsultaRow => ({
    id: a.id,
    professionalId: a.professionalId,
    professionalName: a.professional.user.name,
    specialty: a.professional.specialty,
    dateLabel: formatDateBR(a.scheduledAt),
    timeLabel: formatTimeBR(a.scheduledAt),
    modality: a.modality,
    reason: a.reason,
    status: a.status,
  })

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <PatientSidebar name={user.name} />

      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-100 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900">Minhas Consultas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie seus agendamentos e histórico</p>
        </div>

        <div className="p-8">
          <PatientConsultasClient upcoming={upcomingRows.map(toRow)} past={pastRows.map(toRow)} />
        </div>
      </main>
    </div>
  )
}
