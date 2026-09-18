import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import PublicHeader from '../../../components/PublicHeader'
import PaymentLinkCard from '../../PaymentLinkCard'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { carePlanPaymentLink } from '@/lib/payment-link'

export default async function PagamentoPacote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const enrollment = await prisma.enrollment.findUnique({
    where: { id },
    include: {
      carePlan: {
        select: {
          name: true,
          consultations: true,
          durationMonths: true,
          pricePerConsultation: true,
          paymentLinkUrl: true,
          paymentLinkAmount: true,
        },
      },
      professional: { include: { user: { select: { name: true } } } },
    },
  })
  if (!enrollment || enrollment.patientId !== user.patient?.id) notFound()
  if (enrollment.status === 'ACTIVE' || enrollment.status === 'CANCELLED') {
    redirect('/patient/evolucao')
  }

  // O pacote tem link próprio: o total dele não é o preço da consulta avulsa, e um link do
  // InfinitePay cobra um valor só.
  const link = carePlanPaymentLink(enrollment.carePlan)
  if (!link) notFound()

  const amountCents = enrollment.paidAmountCents ?? link.amountCents

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PublicHeader />
      <div className="max-w-xl mx-auto px-6 py-8">
        <Link
          href="/patient/evolucao"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Minha evolução
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Pagamento do acompanhamento</h1>
        <p className="text-gray-500 text-sm mb-6">
          O programa começa a valer assim que o pagamento for confirmado.
        </p>

        <PaymentLinkCard
          link={{ ...link, amountCents }}
          kind="pacote"
          id={enrollment.id}
          title="Acompanhamento"
          subtitle={`${enrollment.carePlan.name} · ${enrollment.carePlan.consultations} consultas em ${enrollment.carePlan.durationMonths} meses · ${enrollment.professional.user.name}`}
          alreadyClaimed={enrollment.pixClaimedAt !== null}
          deadlineLabel={null}
        />
      </div>
    </div>
  )
}
