import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import PublicHeader from '../../../components/PublicHeader'
import PaymentLinkCard from '../../PaymentLinkCard'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { professionalPaymentLink } from '@/lib/payment-link'
import { formatDateBR, formatTimeBR } from '@/lib/format'

export default async function PagamentoConsulta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { professional: { include: { user: { select: { name: true } } } } },
  })
  // Só o dono paga a própria consulta — e uma cobrança inexistente não deve nem revelar que o
  // id existe.
  if (!appointment || appointment.patientId !== user.patient?.id) notFound()

  // Já pago ou já cancelado: não há o que cobrar, manda para onde a informação está.
  if (appointment.paymentStatus === 'PAID' || appointment.status === 'CANCELLED') {
    redirect('/patient/consultas')
  }

  const link = professionalPaymentLink(appointment.professional)
  if (!link) notFound()

  // O valor é o desta consulta, congelado no agendamento — e não o preço de tabela de hoje. Se
  // o profissional mudou o preço depois, quem vale é o que foi combinado aqui.
  const amountCents = appointment.amountCents ?? link.amountCents

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PublicHeader />
      <div className="max-w-xl mx-auto px-6 py-8">
        <Link
          href="/patient/consultas"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Minhas consultas
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Pagamento da consulta</h1>
        <p className="text-gray-500 text-sm mb-6">
          Sua consulta fica reservada assim que o pagamento for confirmado.
        </p>

        <PaymentLinkCard
          link={{ ...link, amountCents }}
          kind="consulta"
          id={appointment.id}
          title="Consulta"
          subtitle={`${appointment.professional.user.name} · ${formatDateBR(appointment.scheduledAt)} às ${formatTimeBR(appointment.scheduledAt)}`}
          alreadyClaimed={appointment.paymentStatus === 'AWAITING_REVIEW'}
          deadlineLabel={
            appointment.paymentDeadline
              ? `${formatDateBR(appointment.paymentDeadline)} às ${formatTimeBR(appointment.paymentDeadline)}`
              : null
          }
          deadlineISO={appointment.paymentDeadline?.toISOString() ?? null}
        />
      </div>
    </div>
  )
}
