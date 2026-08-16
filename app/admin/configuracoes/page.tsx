import AdminSidebar from '../../components/AdminSidebar'
import AdminConfigForm from './AdminConfigForm'
import { requireRoleOrRedirect } from '@/lib/session'

export default async function AdminConfiguracoes() {
  const admin = await requireRoleOrRedirect('ADMIN')

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <AdminSidebar name={admin.name} />

      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-100 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie sua conta de administrador</p>
        </div>

        <div className="p-8 max-w-3xl">
          <AdminConfigForm name={admin.name} phone={admin.phone ?? ''} />
        </div>
      </main>
    </div>
  )
}
