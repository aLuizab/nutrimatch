import ProfessionalSidebar from '../components/ProfessionalSidebar'
import ConfiguracoesClient from './ConfiguracoesClient'
import { requireRoleOrRedirect } from '@/lib/session'
import { initials } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export default async function Configuracoes() {
  const user = await requireRoleOrRedirect('PROFESSIONAL')
  if (!user.professional) return null

  const profile = {
    name: user.name,
    crn: user.professional.crn,
    email: user.email,
    phone: user.phone ?? '',
    specialty: user.professional.specialty,
    city: user.professional.city,
    price: user.professional.price,
    bio: user.professional.bio,
    initials: initials(user.name),
  }

  const rules = await prisma.availabilityRule.findMany({ where: { professionalId: user.professional.id } })
  const availability = {
    slotMinutes: rules[0]?.slotMinutes ?? 50,
    days: rules.map((r) => ({ weekday: r.weekday, startTime: r.startTime, endTime: r.endTime })),
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <ProfessionalSidebar name={user.name} crn={user.professional.crn} />

      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-100 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie seu perfil e preferências</p>
          {user.professional.status === 'PENDING' && (
            <p className="text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 mt-3 inline-block">
              Seu perfil está em análise e ainda não aparece nas buscas.
            </p>
          )}
        </div>

        <ConfiguracoesClient initialProfile={profile} initialAvailability={availability} />
      </main>
    </div>
  )
}
