import PublicHeader from './PublicHeader'

/**
 * Esqueleto das páginas públicas dinâmicas — perfil, agendamento, pagamento.
 *
 * Mesmo motivo do EsqueletoDePainel, com um agravante: estas são as telas em que alguém chega de
 * fora, sem paciência acumulada. O cabeçalho é o de verdade, não um cinza: ele não depende de
 * nenhuma consulta ao banco, então aparece de imediato e a página já parece a página certa.
 */
export default function EsqueletoPublico({ colunas = 2 }: { colunas?: 1 | 2 }) {
  return (
    <div className="min-h-screen bg-gray-50 font-sans" aria-busy="true" aria-label="Carregando">
      <PublicHeader />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-6" />
        <div className={`grid gap-6 ${colunas === 2 ? 'lg:grid-cols-3' : 'grid-cols-1'}`}>
          <div className={colunas === 2 ? 'lg:col-span-2 space-y-4' : 'space-y-4'}>
            <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3.5 w-40 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
          {colunas === 2 && (
            <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3 h-fit">
              <div className="h-7 w-28 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-11 bg-gray-200 rounded-xl animate-pulse mt-2" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
