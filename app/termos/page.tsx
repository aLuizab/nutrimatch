import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import PublicHeader from '../components/PublicHeader'
import { platformFeePercent } from '@/lib/fees'
import { PAYMENT_REVIEW_WINDOW_HOURS } from '@/lib/appointment-status'

export const metadata = { title: 'Termos de Uso — NutriMatch' }

export default function Termos() {
  const feePercent = platformFeePercent()

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PublicHeader />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Termos de Uso</h1>
        <p className="text-gray-500 text-sm mb-6">Última atualização: 1 de setembro de 2026</p>

        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 leading-relaxed">
            <strong>Este texto é um rascunho</strong>, escrito a partir do funcionamento real da
            plataforma nesta versão — não é uma revisão jurídica. Antes de publicar e cobrar de
            pacientes reais, um advogado precisa validar este conteúdo, especialmente por
            envolver dado de saúde (LGPD) e relação de consumo (CDC).
          </p>
        </div>

        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 text-sm text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">1. O que é a NutriMatch</h2>
            <p>
              A NutriMatch é uma plataforma de intermediação que conecta pacientes a
              nutricionistas. <strong>A NutriMatch não presta atendimento nutricional</strong> —
              cada consulta é conduzida diretamente pelo profissional escolhido, que é o único
              responsável técnico e legal pelo conteúdo do atendimento. Todo profissional
              cadastrado tem o registro no Conselho Regional de Nutrição (CRN) conferido
              manualmente pela nossa equipe antes da aprovação do perfil.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">2. Contas</h2>
            <p>
              Existem três tipos de conta: paciente, profissional e administrador. Você é
              responsável por manter a confidencialidade da sua senha e por toda atividade na sua
              conta. Informações de cadastro devem ser verdadeiras — em especial o CRN informado
              por um profissional, que é a base da verificação de que trata a seção 1.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">3. Agendamento e confirmação</h2>
            <p>
              Ao agendar, o paciente reserva um horário na agenda do profissional e faz o pagamento
              pela plataforma. O horário fica reservado por até {PAYMENT_REVIEW_WINDOW_HOURS} horas
              enquanto a equipe confere o recebimento; passado esse prazo sem conferência, o horário
              é liberado e qualquer valor pago é devolvido (ver a{' '}
              <Link href="/politica-de-cancelamento" className="text-emerald-600 hover:underline">
                Política de Cancelamento e Reembolso
              </Link>
              ).
            </p>
            <p className="mt-2">
              <strong>Confirmado o pagamento, a consulta está marcada.</strong> Não há etapa de
              aceite pelo profissional. Ele pode cancelar uma consulta marcada quando não tiver como
              atendê-la, e nesse caso o valor é devolvido integralmente ao paciente; cancelamentos
              entram no cálculo da confiabilidade exibida no perfil dele.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">4. Pagamentos</h2>
            <p className="mb-2">
              Quando o profissional tem link de pagamento e chave Pix cadastrados, o pagamento das
              consultas e dos programas passa pela NutriMatch, que retém{' '}
              <strong>{feePercent}%</strong> de cada valor pago como comissão da plataforma; o
              restante é repassado ao profissional pela chave Pix informada por ele. Faltando
              qualquer uma das duas, o valor continua sendo combinado diretamente entre paciente e
              profissional, fora da plataforma.
            </p>
            <p>
              As regras de confirmação do pagamento, de repasse ao profissional e de devolução ao
              paciente estão detalhadas na{' '}
              <Link href="/politica-de-cancelamento" className="text-emerald-600 hover:underline">
                Política de Cancelamento e Reembolso
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">5. Programas de acompanhamento</h2>
            <p>
              Profissionais podem oferecer programas de acompanhamento: um número definido de
              consultas ao longo de um período, cobradas de uma vez por um valor menor que a soma
              das consultas avulsas. As condições de reembolso de um programa — tanto o direito de
              arrependimento dos primeiros 7 dias quanto a devolução do que não foi usado ao final
              do prazo — estão na{' '}
              <Link href="/politica-de-cancelamento" className="text-emerald-600 hover:underline">
                Política de Cancelamento e Reembolso
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">6. Conduta proibida</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Fornecer informações falsas sobre identidade, formação ou registro profissional.</li>
              <li>Usar a plataforma para combinar atendimentos e depois pagar fora dela para evitar a comissão, quando a conta do profissional está conectada ao processamento de pagamentos.</li>
              <li>Assediar, discriminar ou agir de má-fé com outro usuário.</li>
              <li>Tentar acessar dados de saúde de terceiros sem relação de atendimento estabelecida.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">7. Responsabilidade</h2>
            <p>
              A NutriMatch fornece a infraestrutura de busca, agendamento e pagamento, mas não
              supervisiona nem se responsabiliza pelo conteúdo clínico de nenhum atendimento. Em
              caso de urgência médica, procure atendimento de emergência — a plataforma não é um
              canal para isso.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">8. Privacidade</h2>
            <p>
              O tratamento de dados pessoais e de saúde é descrito na{' '}
              <Link href="/privacidade" className="text-emerald-600 hover:underline">
                Política de Privacidade
              </Link>
              , parte integrante destes Termos.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">9. Alterações</h2>
            <p>
              Estes termos podem ser atualizados; mudanças relevantes serão comunicadas por
              e-mail com antecedência razoável antes de entrarem em vigor.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">10. Contato</h2>
            <p>
              Dúvidas sobre estes termos: <span className="text-gray-900 font-medium">contato@nutrimatch.com.br</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
