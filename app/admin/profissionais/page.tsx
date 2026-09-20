import AdminSidebar from '../../components/AdminSidebar'
import ProfissionaisTable from './ProfissionaisTable'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'
import DashboardShell from '../../components/DashboardShell'

export default async function AdminProfissionais() {
  const admin = await requireRoleOrRedirect('ADMIN')

  const rows = await prisma.professional.findMany({
    include: {
      user: { select: { name: true } },
      // A mensalidade vive aqui e não em /admin/financeiro porque ela é um fato sobre o
      // profissional, não uma cobrança na fila: quem paga é ele, e o que muda é se ele aparece
      // na busca. Confirmar na mesma linha em que se aprova e se suspende é o lugar natural.
      subscription: { include: { plan: { select: { name: true, monthlyPrice: true } } } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  const professionals = rows.map((p) => ({
    id: p.id,
    name: p.user.name,
    specialty: p.specialties.join(' · '),
    city: p.city,
    price: p.price,
    rating: p.rating,
    reviewCount: p.reviewCount,
    status: p.status,
    crn: p.crn,
    crnVerifiedAt: p.crnVerifiedAt ? p.crnVerifiedAt.toISOString() : null,
    crnVerifiedBy: p.crnVerifiedBy,
    plano: p.subscription?.plan.name ?? null,
    // Em centavos, como monthlyPrice. Zero no plano gratuito, que não tem o que confirmar.
    mensalidadeCents: p.subscription?.plan.monthlyPrice ?? 0,
    pagoAte: p.subscription?.currentPeriodEnd ? p.subscription.currentPeriodEnd.toISOString() : null,
  }))

  const pendingCount = professionals.filter((p) => p.status === 'PENDING').length

  return (
    <DashboardShell sidebar={<AdminSidebar name={admin.name} />}>
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Profissionais</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {professionals.length} cadastrados
          {pendingCount > 0 && (
            <span className="text-yellow-700 font-medium"> · {pendingCount} aguardando aprovação</span>
          )}
        </p>
      </div>

      <div className="p-8">
        <ProfissionaisTable professionals={professionals} />
      </div>
    </DashboardShell>
  )
}
