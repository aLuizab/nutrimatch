import Link from 'next/link'
import { TrendingDown, TrendingUp, Minus, Target } from 'lucide-react'
import DashboardShell from '../../components/DashboardShell'
import PatientSidebar from '../../components/PatientSidebar'
import WeightChart from './WeightChart'
import ProgressForm, { type EntryRow } from './ProgressForm'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'
import { formatDateBR, formatPrice } from '@/lib/format'
import { spDateString } from '@/lib/spdate'
import { getActiveEnrollmentSummary } from '@/lib/enrollments'

export default async function Evolucao() {
  const user = await requireRoleOrRedirect('PATIENT')
  if (!user.patient) return null
  const patientId = user.patient.id

  const [entries, program] = await Promise.all([
    prisma.progressEntry.findMany({ where: { patientId }, orderBy: { recordedAt: 'asc' } }),
    getActiveEnrollmentSummary(patientId),
  ])

  const target = user.patient.targetWeightKg
  const withWeight = entries.filter((e) => e.weightKg !== null)
  const chartPoints = withWeight.map((e) => ({ recordedAt: e.recordedAt, weightKg: e.weightKg as number }))

  const firstWeight = withWeight[0]?.weightKg ?? null
  const currentWeight = withWeight[withWeight.length - 1]?.weightKg ?? null
  const totalDelta = firstWeight !== null && currentWeight !== null ? currentWeight - firstWeight : null
  const toTarget = currentWeight !== null && target != null ? currentWeight - target : null

  // Newest first for the table; delta compares each entry to the previous measurement in time.
  const rows: EntryRow[] = [...entries]
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
    .map((e) => {
      const idx = withWeight.findIndex((w) => w.id === e.id)
      const prev = idx > 0 ? withWeight[idx - 1].weightKg : null
      return {
        id: e.id,
        dateLabel: formatDateBR(e.recordedAt),
        weightKg: e.weightKg,
        waistCm: e.waistCm,
        note: e.note,
        weightDelta: e.weightKg !== null && prev !== null ? e.weightKg - prev : null,
      }
    })

  const DeltaIcon = totalDelta === null || totalDelta === 0 ? Minus : totalDelta < 0 ? TrendingDown : TrendingUp

  return (
    <DashboardShell sidebar={<PatientSidebar name={user.name} />}>
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Minha Evolução</h1>
        <p className="text-sm text-gray-500 mt-0.5">Acompanhe seu progresso entre as consultas</p>
      </div>

      <div className="p-8 space-y-6">
        {program && (
          <div className="bg-emerald-500 rounded-2xl p-6 text-white">
            <p className="text-xs font-bold text-emerald-200 uppercase tracking-widest mb-3">
              Acompanhamento ativo
            </p>
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <h2 className="text-lg font-bold">{program.planName}</h2>
                <p className="text-emerald-100 text-sm mt-0.5">com {program.professionalName}</p>
                <p className="text-emerald-100 text-sm mt-2">
                  {formatPrice(program.pricePerConsultation)} por consulta · até{' '}
                  {formatDateBR(program.endsAt)}
                </p>
              </div>
              <div className="min-w-[180px]">
                <div className="flex justify-between text-sm text-emerald-100 mb-1.5">
                  <span>{program.used} de {program.total} consultas</span>
                  <span>{program.remaining} restantes</span>
                </div>
                <div className="h-2 bg-white/25 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full"
                    style={{ width: `${Math.min(100, (program.used / program.total) * 100)}%` }}
                  />
                </div>
                {program.remaining > 0 && (
                  <Link
                    href={`/agendamento/${program.professionalId}`}
                    className="inline-block mt-3 bg-white text-emerald-600 text-sm font-bold px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors"
                  >
                    Agendar próxima
                  </Link>
                )}
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
            <p className="text-sm text-gray-500">Desde o início</p>
            <p className={`text-2xl font-bold mt-1 flex items-center gap-1.5 ${
              totalDelta !== null && totalDelta < 0 ? 'text-emerald-600' : 'text-gray-900'
            }`}>
              <DeltaIcon size={20} />
              {totalDelta !== null ? `${totalDelta > 0 ? '+' : ''}${totalDelta.toFixed(1)} kg` : '—'}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <Target size={13} className="text-emerald-500" /> Meta
            </p>
            {target != null ? (
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {target.toFixed(1)} kg
                {toTarget !== null && toTarget > 0 && (
                  <span className="text-sm font-medium text-gray-400 ml-2">faltam {toTarget.toFixed(1)}</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-gray-400 mt-2">
                <Link href="/patient/perfil" className="text-emerald-600 font-medium hover:underline">
                  Defina sua meta
                </Link>{' '}
                para acompanhar o progresso
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-1">Evolução do peso</h2>
          <p className="text-xs text-gray-500 mb-4">Passe o mouse sobre os pontos para ver cada medida</p>
          {chartPoints.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              Registre seu peso abaixo para ver seu gráfico de evolução.
            </p>
          ) : (
            <WeightChart points={chartPoints} targetWeightKg={target ?? null} />
          )}
        </div>

        <ProgressForm today={spDateString(new Date())} entries={rows} />
      </div>
    </DashboardShell>
  )
}
