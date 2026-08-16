import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import PublicHeader from '../../components/PublicHeader'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'
import { avatarColor, initials } from '@/lib/format'
import { getAvailableSlots } from '@/lib/availability'
import BookingFlow from './BookingFlow'

export default async function Agendamento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ horario?: string }>
}) {
  const { id } = await params
  const { horario } = await searchParams

  await requireRoleOrRedirect('PATIENT')

  const professional = await prisma.professional.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  })

  if (!professional || professional.status !== 'ACTIVE') {
    notFound()
  }

  const days = await getAvailableSlots(id, 5)

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PublicHeader />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href={`/perfil/${id}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft size={16} /> Voltar ao perfil
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Agendar Consulta</h1>
        <p className="text-gray-500 text-sm mb-8">Escolha o horário e preencha seus dados para confirmar</p>

        <BookingFlow
          professional={{
            id: professional.id,
            name: professional.user.name,
            specialty: professional.specialty,
            price: professional.price,
            modality: professional.modality,
            initials: initials(professional.user.name),
            color: avatarColor(professional.id),
          }}
          days={days}
          initialHorario={horario}
        />
      </div>
    </div>
  )
}
