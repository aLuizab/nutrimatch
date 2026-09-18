import Link from 'next/link'
import { Info } from 'lucide-react'
import type { Prisma } from '@prisma/client'
import PublicHeader from '../components/PublicHeader'
import { prisma } from '@/lib/prisma'
import { PROFESSIONAL_CARD_INCLUDE, toProfessionalCard } from '@/lib/professionals'
import { matchSpecialties } from '@/lib/specialties'
import FilterFields, { type FilterValues } from './FilterFields'
import MobileFilterDrawer from './MobileFilterDrawer'
import SearchBar from './SearchBar'
import SortSelect from './SortSelect'
import ResultCard from './ResultCard'
import { listedWhere, pickSponsored, sponsoredCandidates, SPONSORED_SLOTS } from '@/lib/subscription'

const PAGE_SIZE = 9

interface ResultadosSearchParams {
  q?: string
  especialidade?: string
  modalidade?: string
  precoMax?: string
  avaliacaoMin?: string
  ordenar?: string
  pagina?: string
}

export default async function Resultados({
  searchParams,
}: {
  searchParams: Promise<ResultadosSearchParams>
}) {
  const params = await searchParams

  const filters: FilterValues = {
    q: params.q?.trim() ?? '',
    especialidade: params.especialidade ?? 'Todas',
    modalidade: params.modalidade ?? 'Todas',
    precoMax: params.precoMax ? Number(params.precoMax) : 250,
    avaliacaoMin: params.avaliacaoMin ? Number(params.avaliacaoMin) : 0,
    ordenar: params.ordenar === 'preco' ? 'preco' : params.ordenar === 'avaliacao' ? 'avaliacao' : 'relevancia',
  }
  const page = params.pagina ? Math.max(1, Number(params.pagina)) : 1

  const activeFilterCount = [
    filters.especialidade !== 'Todas',
    filters.modalidade !== 'Todas',
    filters.avaliacaoMin > 0,
    filters.precoMax !== 250,
  ].filter(Boolean).length

  // Scalar-list filters are exact-match only, so free text and short chip labels are
  // resolved to canonical long names before they reach the query.
  const especialidadeMatches = filters.especialidade !== 'Todas' ? matchSpecialties(filters.especialidade) : []
  const qSpecialtyMatches = filters.q ? matchSpecialties(filters.q) : []

  const where: Prisma.ProfessionalWhereInput = {
    status: 'ACTIVE',
    // Only professionals whose subscription is paid up. Empty during the grace period, so this
    // line does nothing until SUBSCRIPTION_ENFORCED_FROM is set.
    ...listedWhere(),
    price: { lte: filters.precoMax },
    rating: { gte: filters.avaliacaoMin },
    ...(filters.especialidade !== 'Todas' ? { specialties: { hasSome: especialidadeMatches } } : {}),
    ...(filters.modalidade === 'Online' ? { modality: { in: ['ONLINE', 'AMBOS'] } } : {}),
    ...(filters.modalidade === 'Presencial' ? { modality: { in: ['PRESENCIAL', 'AMBOS'] } } : {}),
    ...(filters.q
      ? {
          OR: [
            { user: { name: { contains: filters.q, mode: 'insensitive' } } },
            { city: { contains: filters.q, mode: 'insensitive' } },
            ...(qSpecialtyMatches.length > 0 ? [{ specialties: { hasSome: qSpecialtyMatches } }] : []),
          ],
        }
      : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.professional.findMany({
      where,
      include: PROFESSIONAL_CARD_INCLUDE,
      // Default is the weighted score from lib/ranking.ts, materialised on Professional so
      // Postgres can order and paginate by it. The explicit rating/price sorts stay available.
      orderBy:
        filters.ordenar === 'preco'
          ? { price: 'asc' as const }
          : filters.ordenar === 'avaliacao'
            ? { rating: 'desc' as const }
            : [{ rankScore: 'desc' as const }, { reviewCount: 'desc' as const }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.professional.count({ where }),
  ])

  const results = rows.map(toProfessionalCard)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // The sponsored band. Three constraints make it honest rather than an ad dropped on the page:
  // it obeys the same filters as the search (a sponsor who doesn't match what the patient asked
  // for is worse than no result), it excludes anyone already visible in the organic list below
  // (showing the same person twice wastes the slot), and it only appears on the first page.
  // What it never does is change the organic ordering — that comes from rankScore alone.
  let sponsored: typeof results = []
  if (page === 1) {
    const candidateIds = await sponsoredCandidates(rows.map((r) => r.id))
    if (candidateIds.length > 0) {
      const matching = await prisma.professional.findMany({
        where: { ...where, id: { in: candidateIds } },
        include: PROFESSIONAL_CARD_INCLUDE,
        orderBy: [{ rankScore: 'desc' as const }],
      })
      sponsored = pickSponsored(matching, SPONSORED_SLOTS).map(toProfessionalCard)
    }
  }

  const pageHref = (p: number) => {
    const qs = new URLSearchParams()
    if (filters.q) qs.set('q', filters.q)
    if (filters.especialidade !== 'Todas') qs.set('especialidade', filters.especialidade)
    if (filters.modalidade !== 'Todas') qs.set('modalidade', filters.modalidade)
    if (filters.precoMax !== 250) qs.set('precoMax', String(filters.precoMax))
    if (filters.avaliacaoMin) qs.set('avaliacaoMin', String(filters.avaliacaoMin))
    if (filters.ordenar !== 'relevancia') qs.set('ordenar', filters.ordenar)
    if (p > 1) qs.set('pagina', String(p))
    const qsStr = qs.toString()
    return qsStr ? `/resultados?${qsStr}` : '/resultados'
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PublicHeader />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-3 mb-6">
          <SearchBar initial={filters} />
          <div className="hidden md:block">
            <SortSelect initial={filters} />
          </div>
          <MobileFilterDrawer initial={filters} activeCount={activeFilterCount} />
        </div>

        <div className="flex gap-6">
          <aside className="w-64 shrink-0 hidden md:block">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <FilterFields initial={filters} />
            </div>
          </aside>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                <span className="font-bold text-gray-900">{total}</span>{' '}
                profissional{total !== 1 ? 'is' : ''} encontrado{total !== 1 ? 's' : ''}
              </p>
              <div className="md:hidden">
                <SortSelect initial={filters} />
              </div>
            </div>

            {sponsored.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-1.5 mb-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Em destaque hoje</p>
                  <span className="group relative inline-flex">
                    <Info size={12} className="text-gray-300" />
                    <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-56 bg-gray-900 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2 z-10">
                      Rodízio diário entre profissionais da plataforma que não apareceram na
                      primeira página. Muda todo dia e não influencia a ordem dos resultados abaixo.
                    </span>
                  </span>
                </div>
                <div className="space-y-4">
                  {sponsored.map((n) => (
                    <ResultCard key={n.id} n={n} sponsored />
                  ))}
                </div>
                <div className="border-b border-gray-200 mt-6" />
              </div>
            )}

            <div className="space-y-4">
              {results.map((n) => (
                <ResultCard key={n.id} n={n} />
              ))}

              {results.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-gray-400 text-lg font-medium">Nenhum profissional encontrado</p>
                  <p className="text-gray-400 text-sm mt-2">Tente ajustar os filtros de busca</p>
                  <Link href="/resultados" className="inline-block mt-4 text-emerald-600 text-sm font-medium hover:underline">
                    Limpar filtros
                  </Link>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={pageHref(p)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      p === page ? 'bg-emerald-500 text-white' : 'border border-gray-200 text-gray-600 hover:border-emerald-300'
                    }`}
                  >
                    {p}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
