import AdminSidebar from '../../components/AdminSidebar'
import AdminConfigForm from './AdminConfigForm'
import { requireRoleOrRedirect } from '@/lib/session'
import DashboardShell from '../../components/DashboardShell'

export default async function AdminConfiguracoes() {
  const admin = await requireRoleOrRedirect('ADMIN')

  return (
    <DashboardShell sidebar={<AdminSidebar name={admin.name} />}>
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie sua conta de administrador</p>
      </div>

      <div className="p-8 max-w-3xl">
        <AdminConfigForm name={admin.name} phone={admin.phone ?? ''} />
      </div>
    </DashboardShell>
  )
}
