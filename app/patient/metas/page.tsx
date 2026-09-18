import PatientSidebar from '../../components/PatientSidebar'
import DashboardShell from '../../components/DashboardShell'
import MetasClient from './MetasClient'
import { prisma } from '@/lib/prisma'
import { requirePatientProfileOrRedirect } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function PatientMetas() {
  const user = await requirePatientProfileOrRedirect()
  if (!user.patient) return null

  const goals = await prisma.goal.findMany({
    where: { patientId: user.patient.id },
    // Ativas primeiro, e dentro delas a de prazo mais apertado no topo: a ordem por criação
    // enterra justamente a meta que está vencendo.
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    include: { author: { select: { id: true, name: true, role: true } } },
  })

  const serialized = goals.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    targetValue: g.targetValue,
    currentValue: g.currentValue,
    startValue: g.startValue,
    unit: g.unit,
    dueDate: g.dueDate ? g.dueDate.toISOString() : null,
    status: g.status,
    achievedAt: g.achievedAt ? g.achievedAt.toISOString() : null,
    authorName: g.author.name,
    // Quem criou decide o que o paciente pode fazer: a meta do nutricionista ele acompanha,
    // mas não apaga.
    isMine: g.author.id === user.id,
    byProfessional: g.author.role === 'PROFESSIONAL',
  }))

  return (
    <DashboardShell sidebar={<PatientSidebar name={user.name} primaryRole={user.role} />}>
      <MetasClient goals={serialized} />
    </DashboardShell>
  )
}
