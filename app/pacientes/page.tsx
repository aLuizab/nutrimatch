import ProfessionalSidebar from '../components/ProfessionalSidebar'
import PacientesTable, { type PatientRow } from './PacientesTable'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'
import { formatDateBR } from '@/lib/format'
import DashboardShell from '../components/DashboardShell'
import { audit } from '@/lib/audit'

export default async function Pacientes() {
  const user = await requireRoleOrRedirect('PROFESSIONAL')
  if (!user.professional) return null

  const appointments = await prisma.appointment.findMany({
    where: { professionalId: user.professional.id, status: 'CONFIRMED' },
    include: { patient: { include: { user: { select: { name: true } } } } },
    orderBy: { scheduledAt: 'desc' },
  })

  // The roster itself is health-adjacent: it names who is under this professional's care. The
  // per-patient record has its own PATIENT_HEALTH_DATA_VIEWED entry; this one records the
  // list view, which is the access LGPD Art. 37 was otherwise missing.
  audit({
    actorId: user.id,
    actorRole: user.role,
    action: 'PATIENT_LIST_VIEWED',
    metadata: { patientCount: new Set(appointments.map((a) => a.patientId)).size },
  })

  const now = new Date()
  const byPatient = new Map<string, typeof appointments>()
  for (const a of appointments) {
    const list = byPatient.get(a.patientId) ?? []
    list.push(a)
    byPatient.set(a.patientId, list)
  }

  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const patients: PatientRow[] = Array.from(byPatient.entries()).map(([patientId, apts]) => {
    // apts is already sorted desc by scheduledAt from the query above
    const past = apts.filter((a) => a.scheduledAt <= now)
    const future = apts.filter((a) => a.scheduledAt > now).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    const lastVisit = past[0] ?? null
    const nextVisit = future[0] ?? null
    const mostRecent = apts[0]

    return {
      id: patientId,
      name: mostRecent.patient.user.name,
      lastReason: lastVisit?.reason ?? null,
      lastVisitLabel: lastVisit ? formatDateBR(lastVisit.scheduledAt) : null,
      nextVisitLabel: nextVisit ? formatDateBR(nextVisit.scheduledAt) : null,
      modality: mostRecent.modality === 'PRESENCIAL' ? 'PRESENCIAL' : 'ONLINE',
      sessions: apts.length,
      status: nextVisit || (lastVisit && lastVisit.scheduledAt >= sixtyDaysAgo) ? 'ativo' : 'inativo',
    }
  })

  return (
    <DashboardShell sidebar={<ProfessionalSidebar name={user.name} crn={user.professional.crn} />}>
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Pacientes</h1>
        <p className="text-sm text-gray-500 mt-0.5">{patients.length} pacientes cadastrados</p>
      </div>

      <div className="p-8">
        <PacientesTable patients={patients} />
      </div>
    </DashboardShell>
  )
}
