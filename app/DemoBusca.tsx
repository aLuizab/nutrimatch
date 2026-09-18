'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, MapPin, Search, Star } from 'lucide-react'
import { formatPrice } from '@/lib/format'

export interface DemoProfissional {
  id: string | null
  nome: string
  especialidade: string
  rating: number
  reviewCount: number
  preco: number
  cidade: string
  online: boolean
  iniciais: string
  cor: string
}

/**
 * Prévia da busca, na própria página inicial.
 *
 * Os filtros e a digitação funcionam de verdade sobre a lista recebida — é uma amostra do
 * produto, não um desenho de um produto. Quem clica em "Agendar" vai para o perfil real.
 *
 * Quando a plataforma ainda não tem profissionais publicados, a lista vem marcada como
 * ilustrativa e o aviso aparece na tela. Inventar nomes e notas sem dizer que são inventados é
 * o começo de uma página que promete o que o produto não entrega.
 */
export default function DemoBusca({
  profissionais,
  ilustrativo,
}: {
  profissionais: DemoProfissional[]
  ilustrativo: boolean
}) {
  const [filtro, setFiltro] = useState('Todos')
  const [busca, setBusca] = useState('')

  const filtros = useMemo(() => {
    const especialidades = [...new Set(profissionais.map((p) => p.especialidade))]
    return ['Todos', 'Online', ...especialidades]
  }, [profissionais])

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return profissionais.filter((p) => {
      if (filtro === 'Online' && !p.online) return false
      if (filtro !== 'Todos' && filtro !== 'Online' && p.especialidade !== filtro) return false
      if (!termo) return true
      return (
        p.nome.toLowerCase().includes(termo) ||
        p.especialidade.toLowerCase().includes(termo) ||
        p.cidade.toLowerCase().includes(termo)
      )
    })
  }, [profissionais, filtro, busca])

  return (
    <section className="py-20 bg-gray-950 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-900/40 rounded-full blur-3xl" aria-hidden />

      <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg mb-5">
            Veja funcionando
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-[1.15] tracking-tightest">
            Experimente a busca
            <span className="block">agora mesmo</span>
          </h2>
          <p className="text-gray-300 mt-4 leading-relaxed max-w-md">
            Use os filtros ao lado para ver como o paciente encontra um profissional. É a busca de
            verdade, não uma imagem.
          </p>

          <ul className="mt-7 space-y-3">
            {[
              'Filtro por especialidade e modalidade',
              'Ordenação por reputação e tempo de resposta',
              'Agenda em tempo real, sem ida e volta de mensagem',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-gray-200">
                <span className="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                  <Check size={13} className="text-emerald-300" />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/resultados"
            className="inline-flex items-center gap-2 mt-8 bg-white text-gray-900 text-sm font-bold px-5 py-3 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Abrir a busca completa
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-black/40 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Especialidade, nome ou cidade…"
                aria-label="Buscar nesta prévia"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
              {filtros.map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`text-xs font-bold px-3.5 py-2 rounded-full border whitespace-nowrap transition-colors ${
                    filtro === f
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-[22rem] overflow-y-auto">
            {visiveis.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-12 px-6">
                Nenhum resultado para este filtro. Na busca completa há mais profissionais e mais
                critérios.
              </p>
            ) : (
              visiveis.map((p, i) => (
                <div key={p.id ?? i} className="flex items-center gap-3 p-4">
                  <div
                    className={`w-11 h-11 rounded-full text-white flex items-center justify-center text-sm font-bold shrink-0 ${p.cor}`}
                  >
                    {p.iniciais}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 text-sm truncate">{p.nome}</p>
                    <p className="text-xs text-gray-500">{p.especialidade}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                      {p.reviewCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Star size={11} className="text-yellow-400 fill-yellow-400" />
                          <strong className="text-gray-700">{p.rating.toFixed(1)}</strong>
                          <span>· {p.reviewCount}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} />
                        {p.online ? 'Online' : p.cidade}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900 text-sm">{formatPrice(p.preco)}</p>
                    <p className="text-[10px] text-gray-400 mb-1.5">/consulta</p>
                    {p.id ? (
                      <Link
                        href={`/perfil/${p.id}`}
                        className="inline-block bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors"
                      >
                        Ver perfil
                      </Link>
                    ) : (
                      <span className="inline-block bg-gray-100 text-gray-400 text-xs font-bold px-3 py-1.5 rounded-lg cursor-default">
                        Exemplo
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              {ilustrativo ? (
                <>
                  Exemplos ilustrativos enquanto os primeiros perfis são aprovados —{' '}
                  <strong className="text-gray-700">não são profissionais reais</strong>.
                </>
              ) : (
                <>
                  Mostrando <strong className="text-gray-900">{visiveis.length}</strong> de{' '}
                  {profissionais.length} na prévia
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
