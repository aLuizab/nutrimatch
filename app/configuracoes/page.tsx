import ProfessionalSidebar from '../components/ProfessionalSidebar'
import ConfiguracoesClient from './ConfiguracoesClient'
import { requireRoleOrRedirect } from '@/lib/session'
import { initials } from '@/lib/format'
import { photoUploadsEnabled } from '@/lib/cloudinary'
import { prisma } from '@/lib/prisma'
import { payoutSummary, pixEnabled } from '@/lib/pix-payments'
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

  const rules = await prisma.availabilityRule.findMany({ where: { professionalId: user.professional.id } })
  const availability = {
    slotMinutes: rules[0]?.slotMinutes ?? 50,
    days: rules.map((r) => ({ weekday: r.weekday, startTime: r.startTime, endTime: r.endTime })),
  }

  const payouts = await payoutSummary(user.professional.id)

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
        photoUploadsEnabled={photoUploadsEnabled()}
        initialAvailability={availability}
        initialPrefs={{
          notifyBooking: user.notifyBooking,
          notifyCancellation: user.notifyCancellation,
          notifyReviews: user.notifyReviews,
        }}
        pix={{
          platformEnabled: pixEnabled(),
          pixKey: user.professional.pixKey,
          pixKeyType: user.professional.pixKeyType,
          pendingCents: payouts.pendingCents,
          pendingCount: payouts.pendingCount,
          paidCents: payouts.paidCents,
        }}
        feePercent={platformFeePercent()}
      />
    </DashboardShell>
  )
}
