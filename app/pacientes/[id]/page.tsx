import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, Video, MapPin, FileText, Target } from 'lucide-react'
import DashboardShell from '../../components/DashboardShell'
import ProfessionalSidebar from '../../components/ProfessionalSidebar'
import WeightChart from '../../patient/evolucao/WeightChart'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'
import { avatarColor, formatDateBR, formatPrice, formatTimeBR, initials } from '@/lib/format'
import { audit } from '@/lib/audit'

export default async function PacienteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireRoleOrRedirect('PROFESSIONAL')
  if (!user.professional) return null
  const professionalId = user.professional.id

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      appointments: {
        where: { professionalId },
        orderBy: { scheduledAt: 'desc' },
      },
      enrollments: {
        where: { professionalId, status: 'ACTIVE' },
        include: {
          carePlan: { select: { name: true } },
          _count: { select: { appointments: { where: { status: 'CONFIRMED' } } } },
        },
      },
    },
  })

  // Access is granted by having consulted with this patient — not by a live enrollment, which
  // would make the history vanish the day a program ends.
  const confirmed = patient?.appointments.filter((a) => a.status === 'CONFIRMED') ?? []
  if (!patient || confirmed.length === 0) {
    notFound()
  }

  // Health data is scoped to THIS professional's relationship window, not the patient's whole
  // life. Loading every entry would hand over measurements recorded while the patient was
  // under a different professional's care — data minimisation (LGPD Art. 6, necessidade).
  // A small lead-in before the first consultation is included, since the baseline the patient
  // logs when starting treatment is legitimately part of it.
  const firstConsultation = confirmed[confirmed.length - 1].scheduledAt
  const windowStart = new Date(firstConsultation.getTime() - 30 * 24 * 60 * 60 * 1000)

  const progressEntries = await prisma.progressEntry.findMany({
    where: { patientId: patient.id, recordedAt: { gte: windowStart } },
    orderBy: { recordedAt: 'asc' },
  })

  // Records that this professional opened this patient's health data (LGPD Art. 37).
  audit({
    actorId: user.id,
    actorRole: user.role,
    action: 'PATIENT_HEALTH_DATA_VIEWED',
    subjectId: patient.id,
    metadata: { entries: progressEntries.length },
  })

  const withWeight = progressEntries.filter((e) => e.weightKg !== null)
  const chartPoints = withWeight.map((e) => ({ recordedAt: e.recordedAt, weightKg: e.weightKg as number }))
  const firstWeight = withWeight[0]?.weightKg ?? null
  const currentWeight = withWeight[withWeight.length - 1]?.weightKg ?? null
  const totalDelta = firstWeight !== null && currentWeight !== null ? currentWeight - firstWeight : null

  const program = patient.enrollments[0] ?? null
  const used = program?._count.appointments ?? 0

  return (
    <DashboardShell sidebar={<ProfessionalSidebar name={user.name} crn={user.professional.crn} />}>
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <Link href="/pacientes" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors">
          <ArrowLeft size={15} /> Voltar aos pacientes
        </Link>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 ${avatarColor(patient.id)} text-white rounded-full flex items-center justify-center font-bold shrink-0`}>
            {initials(patient.user.name)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{patient.user.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {patient.goal ?? 'Sem objetivo definido'}
              {patient.city ? ` · ${patient.city}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {program && (
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Em acompanhamento</p>
                <p className="font-bold text-gray-900 mt-1">{program.carePlan.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatPrice(program.pricePerConsultation)} por consulta · até {formatDateBR(program.endsAt)}
                </p>
              </div>
              <div className="min-w-[180px]">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>{used} de {program.consultations} consultas</span>
                  <span>{Math.max(0, program.consultations - used)} restantes</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, (used / program.consultations) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500">Peso atual</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {currentWeight !== null ? `${currentWeight.toFixed(1)} kg` : '—'}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500">Variação total</p>
            <p className={`text-2xl font-bold mt-1 ${totalDelta !== null && totalDelta < 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
              {totalDelta !== null ? `${totalDelta > 0 ? '+' : ''}${totalDelta.toFixed(1)} kg` : '—'}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <Target size={13} className="text-emerald-500" /> Meta do paciente
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {patient.targetWeightKg != null ? `${patient.targetWeightKg.toFixed(1)} kg` : '—'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-1">Evolução do peso</h2>
          <p className="text-xs text-gray-500 mb-4">Medidas registradas pelo paciente</p>
          {chartPoints.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              O paciente ainda não registrou nenhuma medida.
            </p>
          ) : (
            <WeightChart points={chartPoints} targetWeightKg={patient.targetWeightKg ?? null} />
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-5">Histórico de consultas</h2>
          <div className="space-y-3">
            {patient.appointments.map((a) => (
              <div key={a.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                    <Calendar size={14} className="text-emerald-500" />
                    {formatDateBR(a.scheduledAt)} às {formatTimeBR(a.scheduledAt)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    {a.modality === 'ONLINE' ? <Video size={12} /> : <MapPin size={12} />}
                    {a.modality === 'ONLINE' ? 'Online' : 'Presencial'}
                  </span>
                  <span className="text-xs text-gray-500">{formatPrice(a.price)}</span>
                  {a.enrollmentId && (
                    <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                      programa
                    </span>
                  )}
                  {a.status === 'CANCELLED' && (
                    <span className="text-xs font-medium bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Cancelada</span>
                  )}
                </div>
                {a.reason && <p className="text-sm text-gray-500 mt-2">{a.reason}</p>}
                {a.summary && (
                  <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                      <FileText size={12} /> Resumo
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{a.summary}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
