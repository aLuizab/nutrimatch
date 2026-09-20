import AdminSidebar from '../../components/AdminSidebar'
import DashboardShell from '../../components/DashboardShell'
import FinanceiroClient, { type PendingCharge, type PendingPayout } from './FinanceiroClient'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'
import { formatDateBR, formatTimeBR } from '@/lib/format'
import { platformPix } from '@/lib/pix-payments'

export const metadata = { title: 'Financeiro — NutriMatch' }

export default async function AdminFinanceiro() {
  const admin = await requireRoleOrRedirect('ADMIN')
  const platform = platformPix()

  const [appointments, enrollments, payouts] = await Promise.all([
    prisma.appointment.findMany({
      // AWAITING_REVIEW é o que o paciente declarou ter pago; PENDING é o que ele nunca
      // declarou. Antes só o primeiro chegava aqui, e quem pagava no InfinitePay sem voltar
      // para clicar "já paguei" — a maioria, porque o link abre fora do site — sumia da fila
      // e via a consulta expirar com o dinheiro já debitado. O admin confere o extrato do
      // InfinitePay de qualquer jeito, então a declaração do paciente é pista útil, não
      // pré-requisito.
      where: {
        paymentStatus: { in: ['AWAITING_REVIEW', 'PENDING'] },
        status: 'AWAITING_CONFIRMATION',
      },
      // Declaradas primeiro (pixClaimedAt não-nulo ordena antes em asc), depois as mais
      // antigas sem declaração.
      orderBy: [{ pixClaimedAt: 'asc' }, { createdAt: 'asc' }],
      include: {
        patient: { include: { user: { select: { name: true } } } },
        professional: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.enrollment.findMany({
      // Mesmo motivo do bloco de consultas: exigir pixClaimedAt escondia do admin todo pacote
      // pago sem a declaração de volta.
      where: { status: 'PENDING_PAYMENT' },
      orderBy: { pixClaimedAt: 'asc' },
      include: {
        carePlan: { select: { name: true } },
        patient: { include: { user: { select: { name: true } } } },
        professional: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.payout.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        professional: { include: { user: { select: { name: true } } } },
        appointment: { select: { scheduledAt: true } },
      },
    }),
  ])

  const charges: PendingCharge[] = [
    ...appointments.map((a) => ({
      kind: 'consulta' as const,
      id: a.id,
      patientName: a.patient.user.name,
      professionalName: a.professional.user.name,
      description: `Consulta em ${formatDateBR(a.scheduledAt)} às ${formatTimeBR(a.scheduledAt)}`,
      amountCents: a.amountCents ?? a.price * 100,
      txid: a.pixTxid,
      claimedAtLabel: a.pixClaimedAt
        ? `${formatDateBR(a.pixClaimedAt)} às ${formatTimeBR(a.pixClaimedAt)}`
        : '—',
      note: a.pixClaimNote,
      declared: a.paymentStatus === 'AWAITING_REVIEW',
      deadlineLabel: a.paymentDeadline
        ? `${formatDateBR(a.paymentDeadline)} às ${formatTimeBR(a.paymentDeadline)}`
        : null,
    })),
    ...enrollments.map((e) => ({
      kind: 'pacote' as const,
      id: e.id,
      patientName: e.patient.user.name,
      professionalName: e.professional.user.name,
      description: e.carePlan.name,
      amountCents: e.paidAmountCents ?? 0,
      txid: e.pixTxid,
      claimedAtLabel: e.pixClaimedAt
        ? `${formatDateBR(e.pixClaimedAt)} às ${formatTimeBR(e.pixClaimedAt)}`
        : '—',
      note: e.pixClaimNote,
      declared: e.pixClaimedAt != null,
      deadlineLabel: null,
    })),
  ]

  const pendingPayouts: PendingPayout[] = payouts.map((p) => ({
    id: p.id,
    professionalName: p.professional.user.name,
    description: p.appointment
      ? `Consulta em ${formatDateBR(p.appointment.scheduledAt)}`
      : 'Consulta removida',
    grossCents: p.grossCents,
    feeCents: p.feeCents,
    netCents: p.netCents,
    // A chave atual do profissional, não o snapshot: é para ela que a transferência vai sair
    // agora. O snapshot serve ao histórico, depois de pago.
    pixKey: p.professional.pixKey,
    pixKeyType: p.professional.pixKeyType,
    createdAtLabel: formatDateBR(p.createdAt),
  }))

  return (
    <DashboardShell sidebar={<AdminSidebar name={admin.name} />}>
      <div className="bg-surface border-b border-gray-100 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Conferência dos Pix recebidos e repasses aos profissionais
        </p>
      </div>

      <div className="p-8">
        {!platform ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <p className="text-sm font-bold text-amber-900">Chave Pix da plataforma não configurada</p>
            <p className="text-sm text-amber-800 mt-1 leading-relaxed">
              Defina <code className="font-mono">PLATFORM_PIX_KEY</code> (e opcionalmente{' '}
              <code className="font-mono">PLATFORM_PIX_NAME</code> e{' '}
              <code className="font-mono">PLATFORM_PIX_CITY</code>) no ambiente. Enquanto não
              houver chave, nenhuma cobrança é gerada e as consultas seguem combinadas
              diretamente entre paciente e profissional.
            </p>
          </div>
        ) : (
          <div className="bg-surface border border-gray-100 rounded-2xl shadow-sm p-5 mb-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Recebendo em
            </p>
            <p className="text-sm text-gray-900 font-mono mt-1">{platform.key}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {platform.name} · {platform.city}
            </p>
          </div>
        )}

        <FinanceiroClient charges={charges} payouts={pendingPayouts} />
      </div>
    </DashboardShell>
  )
}
