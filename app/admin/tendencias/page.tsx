import { TrendingUp } from 'lucide-react'
import AdminSidebar from '../../components/AdminSidebar'
import DashboardShell from '../../components/DashboardShell'
import { requireRoleOrRedirect } from '@/lib/session'
import { getTrends } from '@/lib/trends'
import { CrossTab, Funnel, HorizontalBars, InsufficientData, MonthlyLine, Panel } from './TrendCharts'

export const metadata = { title: 'Tendências — NutriMatch' }

export default async function TendenciasPage() {
  const admin = await requireRoleOrRedirect('ADMIN')
  const t = await getTrends()

  return (
    <DashboardShell sidebar={<AdminSidebar name={admin.name} />}>
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Tendências</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Demanda por especialidade e região, evolução mensal e funil de ativação
        </p>
      </div>

      <div className="p-8 space-y-6">
        {/* The note that makes the rest of the page trustworthy: it says up front that panels
            will refuse to draw, so a missing chart reads as a deliberate choice instead of a
            bug or an empty database. */}
        <div className="flex gap-3 items-start bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4">
          <TrendingUp size={16} className="text-gray-400 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 leading-relaxed">
            Cada painel só desenha o gráfico quando tem amostra para sustentar a leitura. Enquanto a
            plataforma for pequena, vários vão mostrar apenas os números brutos — é intencional:
            um gráfico feito com poucos registros tem exatamente a mesma aparência de autoridade
            que um feito com milhares, e é essa semelhança que induz ao erro.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel
            title="Oferta por especialidade"
            caption="Profissionais ativos que oferecem cada especialidade. Quem oferece mais de uma é contado em todas, então a soma passa do total de profissionais."
          >
            <HorizontalBars
              sampled={t.specialtySupply}
              unit="profissionais"
              shortfall="Há apenas"
              description="Profissionais ativos por especialidade oferecida"
            />
          </Panel>

          <Panel
            title="Procura por especialidade"
            caption="Consultas agendadas, atribuídas às especialidades do profissional escolhido. A consulta não registra especialidade — o paciente agenda com uma pessoa —, então uma consulta com quem tem duas especialidades conta nas duas."
          >
            <HorizontalBars
              sampled={t.specialtyDemand}
              unit="consultas"
              shortfall="Foram agendadas apenas"
              description="Consultas agendadas por especialidade do profissional"
            />
          </Panel>
        </div>

        <Panel
          title="Procura por especialidade e região"
          caption="Consultas agendadas por estado do profissional. O estado é extraído da cidade cadastrada, que é texto livre."
        >
          <CrossTab sampled={t.crossTab} unknownUfCount={t.unknownUfCount} />
        </Panel>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Consultas por mês" caption="Consultas confirmadas, pela data de atendimento.">
            <MonthlyLine sampled={t.months} measure="consultations" />
          </Panel>

          <Panel
            title="Receita por mês"
            caption="Soma do valor das consultas confirmadas. É o valor combinado entre paciente e profissional, não o que a plataforma recebeu."
          >
            <MonthlyLine sampled={t.months} measure="revenue" />
          </Panel>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel
            title="Funil de ativação do profissional"
            caption="Onde os profissionais param entre criar a conta e receber a primeira consulta. Contagens absolutas — a conversão em porcentagem exigiria uma amostra maior para significar algo."
          >
            <Funnel stages={t.funnel} />
          </Panel>

          <Panel
            title="Cancelamentos e expirações"
            caption="Consultas canceladas por qualquer das partes, mais as que o profissional deixou expirar sem confirmar."
          >
            {t.cancellation.sufficient ? (
              <div className="space-y-4">
                <div>
                  <p className="text-4xl font-bold text-gray-900">
                    {(t.cancellation.data.rate * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t.cancellation.data.cancelled + t.cancellation.data.expired} de{' '}
                    {t.cancellation.data.total} consultas
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500">Canceladas</p>
                    <p className="text-lg font-bold text-gray-900">{t.cancellation.data.cancelled}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500">Expiradas sem confirmação</p>
                    <p className="text-lg font-bold text-gray-900">{t.cancellation.data.expired}</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <InsufficientData
                  sample={t.cancellation.sample}
                  minimum={t.cancellation.minimum}
                  what="Uma taxa precisa de volume para ser estável e a plataforma registrou"
                />
                <div className="grid grid-cols-3 gap-3 text-sm mt-4">
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500">Consultas</p>
                    <p className="text-lg font-bold text-gray-900">{t.cancellation.data.total}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500">Canceladas</p>
                    <p className="text-lg font-bold text-gray-900">{t.cancellation.data.cancelled}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500">Expiradas</p>
                    <p className="text-lg font-bold text-gray-900">{t.cancellation.data.expired}</p>
                  </div>
                </div>
              </>
            )}
          </Panel>
        </div>

        <Panel
          title="Distribuição regional dos profissionais"
          caption="Profissionais ativos por estado, extraído da cidade cadastrada."
        >
          <HorizontalBars
            sampled={t.byUf}
            unit="profissionais"
            shortfall="Há apenas"
            description="Profissionais ativos por estado"
          />
        </Panel>
      </div>
    </DashboardShell>
  )
}
