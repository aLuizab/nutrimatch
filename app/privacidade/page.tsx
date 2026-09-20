import { AlertTriangle } from 'lucide-react'
import PublicHeader from '../components/PublicHeader'

export const metadata = { title: 'Política de Privacidade — NutriMatch' }

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PublicHeader />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Política de Privacidade</h1>
        <p className="text-gray-500 text-sm mb-6">Última atualização: 1 de setembro de 2026</p>

        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 leading-relaxed">
            <strong>Este texto é um rascunho</strong>, escrito a partir do que a plataforma
            realmente coleta e faz com os dados nesta versão — não é uma revisão jurídica. Dado de
            saúde é dado sensível pela LGPD (art. 5º, II), com regras mais rígidas do que dado
            comum; um advogado precisa validar este conteúdo, e a plataforma precisa nomear um
            encarregado (DPO) de verdade, antes de tratar dados de pacientes reais.
          </p>
        </div>

        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 text-sm text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">1. Quais dados coletamos</h2>
            <p className="mb-2"><strong>De todos os usuários:</strong> nome, e-mail, telefone, senha (armazenada com hash, nunca em texto puro).</p>
            <p className="mb-2"><strong>De pacientes:</strong> data de nascimento, objetivo declarado, cidade e, se você optar por registrar, peso, medida de cintura e anotações de evolução ao longo do acompanhamento — dado de saúde sensível, só coletado se você mesmo escolher preenchê-lo.</p>
            <p className="mb-2"><strong>De profissionais:</strong> CRN e sua verificação, especialidades, biografia, cidade, valor da consulta e a chave Pix usada para receber os repasses. A NutriMatch nunca vê nem armazena números de cartão: o pagamento acontece fora daqui, na página do InfinitePay.</p>
            <p>
              <strong>De cada consulta e conversa entre as partes:</strong> data, modalidade,
              motivo informado, telefone de contato, resumo pós-consulta escrito pelo profissional,
              e avaliações. <strong>Automaticamente:</strong> endereço IP (usado só para limitar
              tentativas abusivas de login e cadastro, não é armazenado além disso), e um registro
              de auditoria de quem acessou dados de saúde de quem e quando — exigido pelo art. 37
              da LGPD para dado sensível.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">2. Por que coletamos e com que base legal</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Execução de contrato</strong> (art. 7º, V): nome, e-mail, telefone, dados de agendamento e pagamento — sem eles não há como marcar nem cobrar uma consulta.</li>
              <li><strong>Consentimento</strong> (art. 11, I, para dado sensível): peso, medidas e anotações de evolução são opcionais — você decide se registra, e pode apagar a qualquer momento.</li>
              <li><strong>Cumprimento de obrigação legal</strong> (art. 7º, II): o registro de auditoria de acesso a dado de saúde, e a guarda de comprovantes fiscais de pagamento.</li>
              <li><strong>Legítimo interesse</strong> (art. 7º, IX): limitar tentativas de login e cadastro para proteger todas as contas contra ataques automatizados.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">3. Com quem compartilhamos</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>O profissional ou paciente do outro lado de uma consulta</strong> — só o necessário para o atendimento acontecer (nome, contato, motivo da consulta).</li>
              <li><strong>InfinitePay</strong> (processamento de pagamento) — o pagamento é feito na página deles, fora da NutriMatch. Recebem os dados necessários para a cobrança e nenhum dado de saúde.</li>
              <li><strong>Resend</strong> (envio de e-mail transacional) — seu e-mail e o conteúdo das notificações que a plataforma envia (confirmações, lembretes).</li>
              <li>
                Não vendemos dado pessoal a terceiros, nem usamos dado de saúde para publicidade.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">4. Seus direitos</h2>
            <p className="mb-2">Pela LGPD (art. 18), você pode a qualquer momento:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Confirmar se tratamos algum dado seu, e acessá-lo;</li>
              <li>Corrigir dado incompleto, inexato ou desatualizado;</li>
              <li>Pedir a anonimização, bloqueio ou eliminação de dado desnecessário;</li>
              <li>Pedir a portabilidade dos seus dados a outro fornecedor;</li>
              <li>Excluir dado tratado com base no seu consentimento (ex.: suas anotações de evolução);</li>
              <li>Revogar consentimento e saber com quem compartilhamos seu dado.</li>
            </ul>
            <p className="mt-2">
              Para exercer qualquer um desses direitos: <span className="text-gray-900 font-medium">privacidade@nutrimatch.com.br</span>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">5. Por quanto tempo guardamos</h2>
            <p>
              Enquanto sua conta estiver ativa, e depois pelo prazo exigido por obrigação legal
              (registros fiscais e de auditoria de dado de saúde têm prazo de guarda próprio,
              mesmo após a exclusão da conta). Dado de evolução (peso, medidas, anotações) é
              excluído quando você pede, dentro do que a obrigação legal de auditoria ainda exigir
              manter registrado como tendo existido.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">6. Segurança</h2>
            <p>
              Senhas são armazenadas com hash (nunca em texto puro), a sessão usa um cookie que o
              JavaScript da página não consegue ler, e o acesso a dado de saúde por profissionais e
              administradores fica registrado em log de auditoria. Nenhum sistema é
              inviolável — em caso de incidente de segurança que gere risco a você, seremos
              notificados e cumpriremos o dever de comunicação da LGPD (art. 48).
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">7. Contato e encarregado (DPO)</h2>
            <p>
              <span className="text-gray-900 font-medium">privacidade@nutrimatch.com.br</span>.
              O nome e contato direto do encarregado de dados desta operação ainda precisam ser
              formalizados e publicados aqui antes do lançamento.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
