import AdminSidebar from '../../components/AdminSidebar'
import DashboardShell from '../../components/DashboardShell'
import LinksClient from './LinksClient'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'
import { carePlanTotalReais } from '@/lib/payment-link'
import { reaisToCents } from '@/lib/money'

export const dynamic = 'force-dynamic'

export default async function LinksDePagamento() {
  const user = await requireRoleOrRedirect('ADMIN')

  const professionals = await prisma.professional.findMany({
    where: { status: { in: ['ACTIVE', 'PENDING'] } },
    include: {
      user: { select: { name: true, email: true } },
      carePlans: { where: { active: true }, orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const rows = professionals.map((p) => ({
    id: p.id,
    name: p.user.name,
    email: p.user.email,
    status: p.status,
    hasPixKey: Boolean(p.pixKey?.trim()),
    priceCents: reaisToCents(p.price),
    link: p.paymentLinkUrl,
    // Valor para o qual o link foi criado. Diferente do preço de hoje significa link
    // envelhecido: cobra o valor antigo e nada avisa.
    linkAmountCents: p.paymentLinkAmount != null ? reaisToCents(p.paymentLinkAmount) : null,
    plans: p.carePlans.map((c) => ({
      id: c.id,
      name: c.name,
      totalCents: reaisToCents(carePlanTotalReais(c)),
      link: c.paymentLinkUrl,
      linkAmountCents: c.paymentLinkAmount != null ? reaisToCents(c.paymentLinkAmount) : null,
    })),
  }))

  return (
    <DashboardShell sidebar={<AdminSidebar name={user.name} />}>
      <LinksClient rows={rows} />
    </DashboardShell>
  )
}
