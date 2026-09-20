import { AlertCircle, Check, CheckCircle2, Info, X } from 'lucide-react'
import ProfessionalSidebar from '../components/ProfessionalSidebar'
import DashboardShell from '../components/DashboardShell'
import { requireRoleOrRedirect } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { formatDateBR } from '@/lib/format'
import { platformFeePercent } from '@/lib/fees'
import { ensureSubscription, entitlementsFor, inGracePeriod, subscriptionEnforcedFrom } from '@/lib/subscription'
import PagarMensalidade from './PagarMensalidade'

export const metadata = { title: 'Assinatura — NutriMatch' }

export default async function AssinaturaPage() {
  const user = await requireRoleOrRedirect('PROFESSIONAL')

  const sub = await ensureSubscription(user.professional!.id)
  const entitlements = entitlementsFor(sub)
  const plans = await prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  })
  // O plano pago — é dele que sai o link de cobrança. Um plano de preço zero não tem o que
  // cobrar, então o botão de pagamento não aparece para quem só tem o gratuito na lista.
  const pago = plans.find((p) => p.monthlyPrice > 0) ?? null
  const enforcedFrom = subscriptionEnforcedFrom()
  const grace = inGracePeriod()
  const isPaying = !entitlements.viaGrace && entitlements.canReceiveBookings

  return (
    <DashboardShell sidebar={<ProfessionalSidebar name={user.name} crn={user.professional!.crn} />}>
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Assinatura</h1>
        <p className="text-sm text-gray-500 mt-0.5">Seu plano na plataforma e o que ele libera</p>
      </div>

      <div className="p-8 max-w-4xl space-y-6">
        {/* Current state, stated plainly — including the uncomfortable part, that today's access
            may be coming from the grace period and not from anything they bought. */}
        <section className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Plano atual</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{entitlements.planName}</p>
              {/* "Pago até", não "renova em": não existe renovação automática. A data é um
                  fato sobre o que já foi pago. Dizer "renova" faria o profissional perder o
                  acesso esperando uma cobrança que nunca vai chegar. */}
              {sub?.currentPeriodEnd && isPaying && (
                <p className="text-sm text-gray-500 mt-1">
                  Pago até <strong>{formatDateBR(sub.currentPeriodEnd)}</strong>. A renovação não é
                  automática: pague de novo antes dessa data para não sair da busca.
                </p>
              )}
            </div>
            {pago && (
              <PagarMensalidade
                url={pago.paymentLinkUrl}
                amountCents={pago.paymentLinkAmount ?? pago.monthlyPrice}
                jaPago={isPaying}
              />
            )}
          </div>

          {entitlements.status === 'PAST_DUE' && (
            <div className="flex gap-3 items-start bg-amber-50 border border-amber-100 rounded-xl px-4 py-3.5 mt-5">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900">
                A mensalidade venceu e ainda não foi paga. Seu acesso continua por enquanto, mas para
                não perder os agendamentos pague pelo botão acima — e lembre que a liberação depende
                de a administração conferir o comprovante.
              </p>
            </div>
          )}

          {grace && (
            <div className="flex gap-3 items-start bg-blue-50 border border-blue-100 rounded-xl px-4 py-3.5 mt-5">
              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900">
                {enforcedFrom ? (
                  <>
                    Você está recebendo agendamentos no período de carência, que vai até{' '}
                    <strong>{formatDateBR(enforcedFrom)}</strong>. Depois dessa data, só quem assina o
                    plano Profissional continua recebendo.
                  </>
                ) : (
                  <>
                    A cobrança de assinatura ainda não está valendo: todos os profissionais recebem
                    agendamentos normalmente. Avisaremos com antecedência antes de qualquer mudança.
                  </>
                )}
              </p>
            </div>
          )}

          {/* Como a confirmação é humana, o profissional precisa saber onde o pagamento dele
              está — senão o silêncio entre pagar e ser liberado parece falha. */}
          <div className="flex gap-3 items-start bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 mt-5">
            <Info size={16} className="text-gray-400 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600 leading-relaxed">
              A mensalidade é paga por link e conferida por uma pessoa — não há cobrança automática
              no cartão, e nada é debitado sozinho. Se pagar e a data acima não mudar até o próximo
              dia útil, fale com a administração com o comprovante em mãos.
            </p>
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const current = sub?.planId === plan.id
            return (
              <section
                key={plan.id}
                className={`bg-white rounded-2xl p-6 border ${
                  current ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-900">{plan.name}</h2>
                  {current && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                      Atual
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-3">
                  {plan.monthlyPrice === 0 ? (
                    'Grátis'
                  ) : (
                    <>
                      R$ {(plan.monthlyPrice / 100).toFixed(2).replace('.', ',')}
                      <span className="text-sm font-normal text-gray-400">/mês</span>
                    </>
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{plan.description}</p>

                <ul className="mt-5 space-y-2.5 text-sm">
                  <Feature on>Perfil publicado e visível na busca</Feature>
                  <Feature on>Recebe avaliações de pacientes</Feature>
                  <Feature on={plan.canReceiveBookings}>Recebe agendamentos pela plataforma</Feature>
                  <Feature on={plan.sponsored}>Entra no rodízio da faixa &quot;Patrocinado&quot;</Feature>
                </ul>
              </section>
            )
          })}
        </div>

        {/* The part a marketplace is usually vague about. Being explicit here is what keeps the
            ranking claim credible everywhere else in the product. */}
        <section className="bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-gray-900">O que a assinatura não compra</h2>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            Assinar <strong>não melhora sua posição na lista de resultados</strong>. A ordem dos
            resultados vem só da avaliação dos pacientes, do seu tempo de resposta e da atividade
            recente do perfil. O que o plano pago dá é uma vaga na faixa separada e rotulada como
            &quot;Patrocinado&quot;, no topo da página — o paciente vê claramente que aquilo é espaço
            comprado.
          </p>
          <p className="text-sm text-gray-600 mt-3 leading-relaxed">
            A assinatura também é separada da taxa por consulta: a plataforma retém{' '}
            <strong>{platformFeePercent()}%</strong> de cada consulta paga pelo app, e isso continua
            valendo em qualquer plano.
          </p>
        </section>
      </div>
    </DashboardShell>
  )
}

function Feature({ on = false, children }: { on?: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-start gap-2 ${on ? 'text-gray-700' : 'text-gray-400'}`}>
      {on ? (
        <Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />
      ) : (
        <X size={15} className="text-gray-300 shrink-0 mt-0.5" />
      )}
      <span>{children}</span>
    </li>
  )
}
