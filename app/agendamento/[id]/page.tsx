import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import PublicHeader from '../../components/PublicHeader'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { avatarColor, formatDateBR, formatTimeBR, initials } from '@/lib/format'
import { specialtyLabel } from '@/lib/specialties'
import { BOOKING_HORIZON_DAYS, getAvailableSlots } from '@/lib/availability'
import { addDaysToDateString, spDateString } from '@/lib/spdate'
import { resolveActiveEnrollment } from '@/lib/enrollments'
import { isWithinRescheduleWindow } from '@/lib/appointment-status'
import BookingFlow from './BookingFlow'
import { paymentRequirementFor } from '@/lib/payments'

export default async function Agendamento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ horario?: string; remarcar?: string }>
}) {
  const { id } = await params
  const { horario, remarcar } = await searchParams

  // Qualquer sessão pode abrir o agendamento — nutricionista e admin também se consultam. O
  // perfil de paciente só é criado quando a consulta é de fato marcada (POST /api/appointments).
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const professional = await prisma.professional.findUnique({
    where: { id },
    include: { user: { select: { name: true } } },
  })

  if (!professional || professional.status !== 'ACTIVE') {
    notFound()
  }

  // Remarcação de uma consulta já confirmada: mesma tela de escolher horário, mas o rodapé do
  // BookingFlow troca o PATCH de reagendamento em vez de criar um agendamento novo. Validado
  // aqui, não só no cliente — a rota de PATCH revalida tudo de novo antes de mexer no banco.
  let reschedule: { appointmentId: string; oldDateLabel: string; oldTimeLabel: string } | null = null
  if (remarcar) {
    const target = await prisma.appointment.findUnique({ where: { id: remarcar } })
    if (
      target &&
      target.patientId === user.patient?.id &&
      target.professionalId === id &&
      target.status === 'CONFIRMED' &&
      isWithinRescheduleWindow(target.scheduledAt)
    ) {
      reschedule = {
        appointmentId: target.id,
        oldDateLabel: formatDateBR(target.scheduledAt),
        oldTimeLabel: formatTimeBR(target.scheduledAt),
      }
    }
  }

  // A janela inteira, não os próximos cinco dias: o calendário precisa saber quais dias dos três
  // meses têm vaga para poder desenhá-los, e uma segunda requisição a cada troca de mês faria a
  // navegação piscar. São ~65 dias com horário livre no pior caso, o que cabe folgado na página.
  const hoje = spDateString(new Date())
  const janela = { primeiroDia: hoje, ultimoDia: addDaysToDateString(hoje, BOOKING_HORIZON_DAYS) }
  const days = await getAvailableSlots(id, BOOKING_HORIZON_DAYS)

  // Resolved against the first bookable slot via the same helper the booking API uses, so the
  // price shown here can't drift from the price actually charged.
  const firstSlot = days[0]?.times[0]
  const active =
    user.patient && firstSlot
      ? await resolveActiveEnrollment(user.patient.id, professional.id, firstSlot)
      : null

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PublicHeader />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href={`/perfil/${id}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft size={16} /> Voltar ao perfil
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {reschedule ? 'Remarcar Consulta' : 'Agendar Consulta'}
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          {reschedule
            ? `Escolha o novo horário — a consulta atual, ${reschedule.oldDateLabel} às ${reschedule.oldTimeLabel}, será liberada.`
            : 'Escolha o horário e preencha seus dados para confirmar'}
        </p>

        <BookingFlow
          professional={{
            id: professional.id,
            name: professional.user.name,
            specialty: specialtyLabel(professional.specialties),
            price: professional.price,
            modality: professional.modality,
            initials: initials(professional.user.name),
            color: avatarColor(professional.id),
          }}
          program={
            active
              ? {
                  price: active.enrollment.pricePerConsultation,
                  consultationNumber: active.used + 1,
                  total: active.enrollment.consultations,
                }
              : null
          }
          paymentRequired={paymentRequirementFor(professional, active != null).required}
          days={days}
          janela={janela}
          initialHorario={horario}
          reschedule={reschedule}
        />
      </div>
    </div>
  )
}
