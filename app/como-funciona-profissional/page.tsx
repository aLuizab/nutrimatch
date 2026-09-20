import Link from 'next/link'
import { Search, CreditCard, Clock, CheckCircle2, Repeat, Percent, Star, Zap, Activity, ShieldCheck, Award } from 'lucide-react'
import PublicHeader from '../components/PublicHeader'
import TierBadge from '../components/TierBadge'
import { platformFeePercent } from '@/lib/fees'
import { WEIGHTS } from '@/lib/ranking'
import { REPUTATION_WEIGHTS, TIERS } from '@/lib/reputation'

export const metadata = { title: 'Como funciona para profissionais — NutriMatch' }

export default function ComoFuncionaProfissional() {
  const feePercent = platformFeePercent()

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PublicHeader />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Como funciona a NutriMatch para profissionais</h1>
        <p className="text-gray-500 text-sm mb-8">
          O ciclo de uma consulta, para que serve a taxa de {feePercent}% e como o ranking de
          busca decide quem aparece primeiro.
        </p>

        <section className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">O ciclo de uma consulta</h2>
          <ol className="space-y-4">
            {[
              { icon: Search, text: 'O paciente encontra seu perfil na busca e escolhe um horário disponível na sua agenda.' },
              { icon: CreditCard, text: 'Se você tem link de pagamento e chave Pix cadastrados, o pagamento é pedido nesse momento: o paciente tem 30 minutos para pagar no link e avisar, senão o horário volta a ficar livre. Faltando link ou chave Pix, o valor continua combinado diretamente com o paciente, como sempre funcionou.' },
              { icon: Clock, text: 'Você tem 24 horas para confirmar ou recusar o pedido — o tempo de resposta é um dos três fatores do ranking (veja abaixo).' },
              { icon: CheckCircle2, text: 'Ao confirmar: se foi cartão, o valor é cobrado nesse instante (nunca antes); se foi Pix, já estava cobrado. Ao recusar ou deixar vencer o prazo: nada fica cobrado no cartão, e um Pix já debitado é devolvido automaticamente — o paciente não perde dinheiro por uma decisão que não foi dele.' },
            ].map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Icon size={16} />
                </div>
                <p className="text-sm text-gray-600 leading-relaxed pt-1">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Repeat size={18} className="text-emerald-500" /> Programas de acompanhamento
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Além de consultas avulsas, você pode oferecer programas — um número de consultas ao
            longo de alguns meses, cobradas de uma vez só por um preço menor que a soma das
            avulsas. O paciente paga na hora da compra, e depois só marca os horários pela
            plataforma, sem pagar de novo a cada consulta. Se sobrarem consultas quando o prazo
            do programa terminar, a diferença é devolvida proporcionalmente — cobrar por uma
            consulta de saúde que nunca aconteceu é o tipo de cobrança que o Código de Defesa do
            Consumidor não permite.
          </p>
        </section>

        <section className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Percent size={18} className="text-emerald-500" /> Para que serve a taxa de {feePercent}%
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            A NutriMatch retém {feePercent}% de cada consulta paga pela plataforma (o restante vai
            para sua chave Pix, já descontada a taxa de processamento do InfinitePay, que é
            separada e não controlada por nós). É o que mantém, sem custo fixo mensal:
          </p>
          <ul className="text-sm text-gray-600 space-y-1.5 list-disc pl-5">
            <li>A infraestrutura de cobrança: link de pagamento pronto, conferência do que entrou e repasse pela sua chave Pix, sem você ter que cobrar ninguém.</li>
            <li>A proteção do modelo de captura: o paciente só é cobrado quando você confirma — o que reduz a hesitação de quem ainda não te conhece e aumenta a chance de o agendamento virar consulta de verdade.</li>
            <li>A visibilidade na busca, a agenda, os lembretes automáticos por e-mail e a verificação do seu CRN, que aparece no seu perfil como selo de confiança.</li>
            <li>O suporte e a manutenção da plataforma em si.</li>
          </ul>
          <p className="text-sm text-gray-600 leading-relaxed mt-3">
            Consultas combinadas diretamente com o paciente (sem link de pagamento) não têm taxa
            nenhuma — mas também não têm nada da lista acima automatizado.
          </p>
        </section>

        <section className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Star size={18} className="text-emerald-500" /> Como funciona o ranking de busca
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            A ordem dos resultados em <Link href="/resultados" className="text-emerald-600 hover:underline">/resultados</Link> é
            calculada, não vendida — três fatores, com estes pesos:
          </p>
          <div className="space-y-3 mb-4">
            {[
              {
                icon: Star,
                label: 'Avaliações',
                weight: WEIGHTS.rating,
                text: `Sua nota média, mas com um ajuste que protege quem está começando: um perfil novo, sem avaliações ainda, entra próximo da média geral da plataforma em vez de ficar no zero — cada avaliação nova pesa mais a partir daí. Não adianta pedir uma avaliação falsa para "destravar": o cálculo já assume uma nota razoável até você ter as suas de verdade.`,
              },
              {
                icon: Zap,
                label: 'Tempo de resposta',
                weight: WEIGHTS.responsiveness,
                text: 'Quanto mais rápido você confirma ou recusa um pedido, melhor. Responder em até 1 hora vale o máximo; passar de 48 horas sem responder zera esse fator (numa escala que desacelera entre esses dois pontos, não uma queda brusca).',
              },
              {
                icon: ShieldCheck,
                label: 'Confiabilidade',
                weight: WEIGHTS.reliability,
                text: 'Você cumpre o que aceitou? Contam as consultas realizadas contra duas falhas: cancelar depois de já ter confirmado (pesa dobrado, porque o paciente reorganizou o dia por causa daquele horário) e deixar um pedido expirar sem resposta. Falta do paciente não pesa contra você.',
              },
              {
                icon: Activity,
                label: 'Atividade recente',
                weight: WEIGHTS.recency,
                text: 'Ter recebido um pedido de consulta nos últimos 7 dias vale o máximo; passar 90 dias sem nenhuma atividade zera esse fator. Ficar ativo na plataforma pesa mais do que qualquer coisa que você escreva no perfil.',
              },
            ].map(({ icon: Icon, label, weight, text }) => (
              <div key={label} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {label} <span className="font-normal text-gray-400">({Math.round(weight * 100)}% do peso)</span>
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed mt-0.5">{text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-3 border border-gray-100 rounded-xl p-4 bg-gray-50/60">
            <ShieldCheck size={18} className="text-gray-500 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600 leading-relaxed">
              O plano de assinatura <strong>não entra nessa conta</strong>. Um plano pago dá acesso
              ao bloco rotativo &ldquo;Patrocinado&rdquo; no topo da busca — uma posição comprada,
              marcada como tal e com aviso explícito de que ela não influencia a ordem dos
              resultados orgânicos abaixo. As duas coisas não se misturam.
            </p>
          </div>
        </section>

        <section id="reputacao" className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 mt-6 scroll-mt-6">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Award size={18} className="text-emerald-500" /> Níveis de reputação
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Sua reputação é uma nota de 0 a 100 que combina{' '}
            <strong>{Math.round(REPUTATION_WEIGHTS.rating * 100)}% avaliações</strong>,{' '}
            <strong>{Math.round(REPUTATION_WEIGHTS.reliability * 100)}% confiabilidade</strong> e{' '}
            <strong>{Math.round(REPUTATION_WEIGHTS.responsiveness * 100)}% tempo de resposta</strong>.
            Atividade recente entra no ranking da busca, mas não aqui: passar um tempo sem atender
            não torna ninguém menos confiável.
          </p>
          <div className="border border-gray-100 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/60 text-gray-500">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">Nível</th>
                  <th className="text-left font-medium px-4 py-2.5">Consultas realizadas</th>
                  <th className="text-left font-medium px-4 py-2.5">Reputação</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((t) => (
                  <tr key={t.id} className="border-t border-gray-100">
                    <td className="px-4 py-2.5">
                      {t.id === 'NOVO' ? (
                        <span className="text-gray-600 font-medium">{t.label}</span>
                      ) : (
                        <TierBadge tier={t.id} />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {t.minFulfilled === 0 ? '—' : `${t.minFulfilled}+`}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {t.minScore === 0 ? '—' : `${Math.round(t.minScore * 100)}+`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mt-4">
            Os dois critérios são obrigatórios: nota alta com três consultas não é reputação, é
            amostra pequena. Seu nível aparece como selo na busca e no seu perfil, e o painel
            mostra exatamente o que falta para o próximo.
          </p>
          <div className="flex items-start gap-3 border border-gray-100 rounded-xl p-4 bg-gray-50/60 mt-4">
            <ShieldCheck size={18} className="text-gray-500 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600 leading-relaxed">
              <strong>Sobre faltas de pacientes:</strong> a falta de um paciente nunca conta
              contra a sua reputação. A plataforma trata isso do outro lado — quem falta sem
              avisar passa a poder manter só uma consulta agendada por vez. Você não recebe nota
              nem histórico de paciente nenhum: decidir quem atender com base num score seria
              transformar acesso a saúde em pontuação, e isso a NutriMatch não faz.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
