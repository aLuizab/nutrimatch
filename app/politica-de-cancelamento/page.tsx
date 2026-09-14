import { AlertTriangle, QrCode, Package, Clock, CalendarClock } from 'lucide-react'
import PublicHeader from '../components/PublicHeader'
import { CONFIRMATION_WINDOW_HOURS, CANCEL_REFUND_CUTOFF_HOURS, RESCHEDULE_CUTOFF_HOURS } from '@/lib/appointment-status'
import { WITHDRAWAL_WINDOW_DAYS } from '@/lib/payments'

export const metadata = { title: 'Política de Cancelamento e Reembolso — NutriMatch' }

export default function PoliticaDeCancelamento() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PublicHeader />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Política de Cancelamento e Reembolso</h1>
        <p className="text-gray-500 text-sm mb-6">
          Última atualização: 14 de setembro de 2026 — regras exigidas pelo Código de Defesa do
          Consumidor (art. 46 e 49) para toda compra feita pela internet.
        </p>

        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 leading-relaxed">
            <strong>Este texto é um rascunho</strong>, escrito a partir do funcionamento real da
            plataforma nesta versão — não é uma revisão jurídica. Um advogado precisa validar
            este conteúdo antes de cobrar de pacientes reais.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 text-sm text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <QrCode size={17} className="text-emerald-500" /> Como o pagamento funciona
            </h2>
            <p className="mb-2">
              O pagamento é por <strong>Pix</strong>, feito para a NutriMatch — não diretamente
              para o profissional. A plataforma repassa a ele o valor já descontada a taxa de
              serviço.
            </p>
            <p className="mb-2">
              O Pix é debitado da sua conta no instante em que você paga. A confirmação do
              recebimento é feita pela nossa equipe, conferindo o extrato: normalmente em algumas
              horas, em dia útil. Enquanto isso, <strong>seu horário fica reservado</strong> — você
              não perde a vaga porque a conferência não é instantânea.
            </p>
            <p>
              Só depois de confirmado o pagamento é que o profissional recebe o pedido e tem até{' '}
              {CONFIRMATION_WINDOW_HOURS} horas para aceitar. Se ele recusar, ou deixar esse prazo
              passar sem responder, <strong>o valor é devolvido integralmente</strong> por Pix para
              a conta de onde veio. A devolução é feita manualmente pela nossa equipe, então leva
              até 2 dias úteis.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Clock size={17} className="text-emerald-500" /> Consulta já confirmada pelo profissional
            </h2>
            <p className="mb-2">
              Depois que o profissional confirma a consulta, o valor pago já está com a plataforma.
              A partir daí:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Você cancela com até {CANCEL_REFUND_CUTOFF_HOURS} horas de antecedência:</strong> reembolso
                integral, devolvido por Pix em até 2 dias úteis.
              </li>
              <li>
                <strong>Você cancela com menos de {CANCEL_REFUND_CUTOFF_HOURS} horas de antecedência:</strong> o
                cancelamento é aceito, mas sem devolução do valor pago.
              </li>
              <li>
                <strong>O profissional cancela</strong> uma consulta que já havia confirmado, a
                qualquer momento: reembolso integral, sempre — a decisão não foi sua, então o
                custo não é seu.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CalendarClock size={17} className="text-emerald-500" /> Remarcar em vez de cancelar
            </h2>
            <p>
              Uma consulta confirmada pode ser remarcada para outro horário disponível na agenda
              do profissional até {RESCHEDULE_CUTOFF_HOURS} horas antes do horário original — uma
              janela mais curta que a de reembolso, já que remarcar não move nenhum valor (nem
              cobra, nem devolve): o mesmo pagamento continua valendo para o novo horário. Passado
              esse prazo, só resta cancelar (sem devolução, conforme a seção acima).
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Package size={17} className="text-emerald-500" /> Programas de acompanhamento (pacotes)
            </h2>
            <p className="mb-2">
              <strong>Primeiros {WITHDRAWAL_WINDOW_DAYS} dias corridos após a compra:</strong> você
              pode cancelar o programa e receber <strong>100% do valor pago de volta</strong>, sem
              precisar dar nenhuma justificativa — é o direito de arrependimento garantido pelo
              art. 49 do CDC para toda compra feita pela internet. Vale mesmo que você já tenha
              usado alguma consulta do programa dentro desses {WITHDRAWAL_WINDOW_DAYS} dias.
            </p>
            <p className="mb-2">
              <strong>Depois desse prazo, e antes do fim do programa:</strong> cancelar não gera
              devolução automática das consultas ainda não usadas nesta versão da plataforma. Se
              você precisar cancelar por um motivo excepcional fora dessa janela, entre em contato
              com o suporte — cada caso é avaliado individualmente.
            </p>
            <p>
              <strong>No fim natural do prazo contratado:</strong> se sobrarem consultas que você
              não chegou a usar, devolvemos a diferença na proporção das consultas não utilizadas —
              cobrar por uma consulta de saúde que nunca aconteceu é exatamente o tipo de
              cláusula que o CDC não permite. A devolução é feita por Pix pela nossa equipe; se
              o prazo do seu programa terminou e você não recebeu, fale com o suporte.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">Como pedir um cancelamento</h2>
            <p>
              Consultas avulsas: pela tela &ldquo;Minhas Consultas&rdquo;. Programas: pela tela
              &ldquo;Minha Evolução&rdquo;, na seção do acompanhamento ativo. Dúvidas:{' '}
              <span className="text-gray-900 font-medium">contato@nutrimatch.com.br</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
