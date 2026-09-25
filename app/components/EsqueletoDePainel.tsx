/**
 * O que aparece enquanto uma página de painel carrega.
 *
 * Existe por um motivo bem concreto, e não por estética. No App Router, **uma navegação para
 * página dinâmica sem `loading.tsx` bloqueia**: o clique não muda nada na tela até o servidor
 * terminar de renderizar. Com um banco remoto, isso são centenas de milissegundos no melhor caso
 * e quase dois segundos quando a conexão está fria — tempo em que a pessoa clica de novo, acha
 * que travou, ou desiste. Nada estava lento: faltava resposta ao clique.
 *
 * O segundo efeito é menos óbvio e igualmente importante: o Next só faz *prefetch* de uma rota
 * dinâmica até a fronteira do `loading.tsx`. Sem esse arquivo não há nada para pré-buscar, então
 * cada navegação começa do zero. Criar o esqueleto liga as duas coisas de uma vez.
 *
 * O esqueleto desenha a barra lateral em cinza em vez de a esconder: a barra de verdade é um
 * client component que precisa do nome de quem está logado, e um layout que perde 256px de
 * largura por meio segundo e depois recupera é mais desconfortável que a espera.
 */
export default function EsqueletoDePainel({
  /** Quantos cartões de conteúdo desenhar. Aproxima a densidade da página que vem. */
  cartoes = 3,
  /** Páginas de listagem ganham uma tabela no lugar dos cartões. */
  tabela = false,
}: {
  cartoes?: number
  tabela?: boolean
}) {
  return (
    <div className="min-h-screen bg-gray-50 font-sans" aria-busy="true" aria-label="Carregando">
      <div className="flex min-h-screen">
        <aside className="w-64 bg-surface border-r border-gray-100 shrink-0 hidden md:flex md:flex-col">
          <div className="p-6 border-b border-gray-100">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="h-3 bg-gray-200 rounded animate-pulse" />
              <div className="h-2.5 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="bg-surface border-b border-gray-100 px-8 py-5 space-y-2">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-3.5 w-64 bg-gray-100 rounded animate-pulse" />
          </div>

          <div className="p-8 space-y-6">
            {tabela ? (
              <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-5 py-4 flex gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-3 flex-1 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="border-b border-gray-50 last:border-0 px-5 py-4 flex gap-6 items-center">
                    <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-3.5 flex-1 bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
                      <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                      <div className="h-7 w-24 bg-gray-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
                {Array.from({ length: cartoes }).map((_, i) => (
                  <div key={i} className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
                    <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-4/5 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
