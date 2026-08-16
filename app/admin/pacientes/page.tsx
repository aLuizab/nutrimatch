import AdminSidebar from '../../components/AdminSidebar'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'
import { formatDateBR, initials } from '@/lib/format'

export default async function AdminPacientes() {
  const admin = await requireRoleOrRedirect('ADMIN')

  const patients = await prisma.patient.findMany({
    include: {
      user: { select: { name: true, email: true } },
      appointments: { orderBy: { scheduledAt: 'desc' }, take: 1 },
      _count: { select: { appointments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <AdminSidebar name={admin.name} />

      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-100 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{patients.length} pacientes cadastrados</p>
        </div>

        <div className="p-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Paciente</th>
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">E-mail</th>
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Cidade</th>
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Consultas</th>
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Última consulta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {initials(p.user.name)}
                        </div>
                        <p className="text-sm font-medium text-gray-900">{p.user.name}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 hidden md:table-cell">{p.user.email}</td>
                    <td className="py-4 px-4 text-sm text-gray-600 hidden sm:table-cell">{p.city || '—'}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">{p._count.appointments}</td>
                    <td className="py-4 px-4 text-sm text-gray-600 hidden lg:table-cell">
                      {p.appointments[0] ? formatDateBR(p.appointments[0].scheduledAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {patients.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-400 font-medium">Nenhum paciente cadastrado</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
