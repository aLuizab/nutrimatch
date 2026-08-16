import AdminSidebar from '../../components/AdminSidebar'
import ProfissionaisTable from './ProfissionaisTable'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'

export default async function AdminProfissionais() {
  const admin = await requireRoleOrRedirect('ADMIN')

  const rows = await prisma.professional.findMany({
    include: { user: { select: { name: true } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  const professionals = rows.map((p) => ({
    id: p.id,
    name: p.user.name,
    specialty: p.specialty,
    city: p.city,
    price: p.price,
    rating: p.rating,
    reviewCount: p.reviewCount,
    status: p.status,
    crn: p.crn,
  }))

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <AdminSidebar name={admin.name} />

      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-100 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900">Profissionais</h1>
          <p className="text-sm text-gray-500 mt-0.5">{professionals.length} profissionais cadastrados</p>
        </div>

        <div className="p-8">
          <ProfissionaisTable professionals={professionals} />
        </div>
      </main>
    </div>
  )
}
