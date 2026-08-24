import PatientSidebar from '../../components/PatientSidebar'
import PatientPerfilForm from './PatientPerfilForm'
import { requireRoleOrRedirect } from '@/lib/session'
import DashboardShell from '../../components/DashboardShell'

export default async function PatientPerfil() {
  const user = await requireRoleOrRedirect('PATIENT')
  if (!user.patient) return null

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
    <DashboardShell sidebar={<PatientSidebar name={user.name} />}>
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie suas informações pessoais</p>
      </div>

      <div className="p-8">
        <PatientPerfilForm initialProfile={profile} />
      </div>
    </DashboardShell>
  )
}
