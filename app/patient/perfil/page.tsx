import { CalendarCheck, AlertTriangle } from 'lucide-react'
import PatientSidebar from '../../components/PatientSidebar'
import PatientPerfilForm from './PatientPerfilForm'
import { requirePatientProfileOrRedirect } from '@/lib/session'
import DashboardShell from '../../components/DashboardShell'
import { getPatientReliability, patientReliabilityNotice } from '@/lib/reputation'

export default async function PatientPerfil() {
  const user = await requirePatientProfileOrRedirect()
  if (!user.patient) return null

  // Confiabilidade é mostrada só aqui, só para o próprio paciente. Nenhuma tela de profissional
  // recebe este dado — ver a nota de abertura de lib/reputation.ts sobre por quê.
  const reliability = await getPatientReliability(user.patient.id)
  const notice = patientReliabilityNotice(reliability)

  const profile = {
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    birthDate: user.patient.birthDate ? user.patient.birthDate.toISOString().slice(0, 10) : '',
    goal: user.patient.goal ?? '',
    city: user.patient.city ?? '',
    targetWeightKg: user.patient.targetWeightKg != null ? String(user.patient.targetWeightKg) : '',
  }

  return (
    <DashboardShell sidebar={<PatientSidebar name={user.name} primaryRole={user.role} />}>
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie suas informações pessoais</p>
      </div>

      <div className="p-8 space-y-6">
        {reliability.rate !== null && (
          <div
            className={`max-w-2xl rounded-2xl border p-5 ${
              notice ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100 shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3">
              {notice ? (
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <CalendarCheck size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-bold ${notice ? 'text-amber-900' : 'text-gray-900'}`}>
                  Comparecimento: {Math.round(reliability.rate * 100)}%
                </p>
                <p className={`text-sm mt-1 leading-relaxed ${notice ? 'text-amber-800' : 'text-gray-500'}`}>
                  {notice ??
                    'Você comparece às consultas que agenda — é isso que mantém sua conta sem nenhuma restrição.'}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Esta informação é só sua: nenhum profissional tem acesso a ela.
                </p>
              </div>
            </div>
          </div>
        )}

        <PatientPerfilForm initialProfile={profile} />
      </div>
    </DashboardShell>
  )
}
