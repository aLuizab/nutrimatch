import ProfessionalSidebar from '../components/ProfessionalSidebar'
import ConfiguracoesClient from './ConfiguracoesClient'
import { requireRoleOrRedirect } from '@/lib/session'
import { initials } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { payoutTotals } from '@/lib/payouts'
import { BOOKING_HORIZON_DAYS } from '@/lib/availability'
import { addDaysToDateString, spDateString } from '@/lib/spdate'
import { platformFeePercent } from '@/lib/fees'
import DashboardShell from '../components/DashboardShell'

export default async function Configuracoes() {
  const user = await requireRoleOrRedirect('PROFESSIONAL')
  if (!user.professional) return null

  const profile = {
    name: user.name,
    crn: user.professional.crn,
    email: user.email,
    phone: user.phone ?? '',
    specialties: user.professional.specialties,
    city: user.professional.city,
    price: user.professional.price,
    bio: user.professional.bio,
    initials: initials(user.name),
    photoUrl: user.photoUrl ?? null,
  }

  const hoje = spDateString(new Date())
  const ultimoDia = addDaysToDateString(hoje, BOOKING_HORIZON_DAYS)

  const [rules, overrides] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { professionalId: user.professional.id } }),
    // Só a janela que a pessoa consegue editar. Exceção de data passada não tem o que fazer aqui,
    // e carregar o histórico inteiro cresceria para sempre sem servir a ninguém.
    prisma.availabilityOverride.findMany({
      where: { professionalId: user.professional.id, date: { gte: hoje, lte: ultimoDia } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    }),
  ])
  const availability = {
    slotMinutes: rules[0]?.slotMinutes ?? 50,
    days: rules.map((r) => ({ weekday: r.weekday, startTime: r.startTime, endTime: r.endTime })),
  }

  // Uma entrada por data, com os blocos dela juntos: é assim que a tela pensa em exceção, e
  // agrupar aqui evita a mesma conta em dois lugares.
  const excecoes = Array.from(
    overrides.reduce((mapa, o) => {
      const atual = mapa.get(o.date) ?? { date: o.date, closed: false, blocks: [] }
      if (o.closed) atual.closed = true
      else if (o.startTime && o.endTime) atual.blocks.push({ startTime: o.startTime, endTime: o.endTime })
      mapa.set(o.date, atual)
      return mapa
    }, new Map<string, { date: string; closed: boolean; blocks: { startTime: string; endTime: string }[] }>()),
    ([, v]) => v
  )

  const payouts = await payoutTotals(user.professional.id)

  return (
    <DashboardShell sidebar={<ProfessionalSidebar name={user.name} crn={user.professional.crn} />}>
      <div className="bg-surface border-b border-gray-100 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie seu perfil e preferências</p>
        {user.professional.status === 'PENDING' && (
          <p className="text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 mt-3 inline-block">
            Seu perfil está em análise e ainda não aparece nas buscas.
          </p>
        )}
      </div>

      <ConfiguracoesClient
        initialProfile={profile}
        initialAvailability={availability}
        excecoesDeData={excecoes}
        janelaDeAgenda={{ primeiroDia: hoje, ultimoDia }}
        initialPrefs={{
          notifyBooking: user.notifyBooking,
          notifyCancellation: user.notifyCancellation,
          notifyReviews: user.notifyReviews,
        }}
        pix={{
          pixKey: user.professional.pixKey,
          pixKeyType: user.professional.pixKeyType,
          pendingCents: payouts.pendingCents,
          pendingCount: payouts.pendingCount,
          processingCents: payouts.processingCents,
          processingCount: payouts.processingCount,
          paidCents: payouts.paidCents,
        }}
        feePercent={platformFeePercent()}
      />
    </DashboardShell>
  )
}
