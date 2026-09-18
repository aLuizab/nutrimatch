import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import PublicHeader from '../../../components/PublicHeader'
import PixCheckout from '../../PixCheckout'
import PaymentLinkCard from '../../PaymentLinkCard'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { paymentLinkUrl } from '@/lib/payment-link'
import { appointmentPixCharge } from '@/lib/pix-payments'
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

  const charge = appointmentPixCharge(appointment)
  if (!charge) notFound()

  const link = paymentLinkUrl()

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

        {link && <PaymentLinkCard url={link} amountCents={charge.amountCents} />}

        <PixCheckout
          kind="consulta"
          id={appointment.id}
          payload={charge.payload}
          txid={charge.txid}
          amountCents={charge.amountCents}
          title="Consulta"
          subtitle={`${appointment.professional.user.name} · ${formatDateBR(appointment.scheduledAt)} às ${formatTimeBR(appointment.scheduledAt)}`}
          alreadyClaimed={appointment.paymentStatus === 'AWAITING_REVIEW'}
          deadlineLabel={
            appointment.paymentDeadline
              ? `${formatDateBR(appointment.paymentDeadline)} às ${formatTimeBR(appointment.paymentDeadline)}`
              : null
          }
        />
      </div>
    </div>
  )
}
