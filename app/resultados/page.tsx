import Link from 'next/link'
import { Star, MapPin, Video, Users } from 'lucide-react'
import type { Prisma } from '@prisma/client'
import PublicHeader from '../components/PublicHeader'
import { prisma } from '@/lib/prisma'
import { PROFESSIONAL_CARD_INCLUDE, toProfessionalCard } from '@/lib/professionals'
import FilterFields, { type FilterValues } from './FilterFields'
import MobileFilterDrawer from './MobileFilterDrawer'
import SearchBar from './SearchBar'
import SortSelect from './SortSelect'

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
    ordenar: params.ordenar === 'preco' ? 'preco' : 'avaliacao',
  }
  const page = params.pagina ? Math.max(1, Number(params.pagina)) : 1

  const activeFilterCount = [
    filters.especialidade !== 'Todas',
    filters.modalidade !== 'Todas',
    filters.avaliacaoMin > 0,
    filters.precoMax !== 250,
  ].filter(Boolean).length

  const where: Prisma.ProfessionalWhereInput = {
    status: 'ACTIVE',
    price: { lte: filters.precoMax },
    rating: { gte: filters.avaliacaoMin },
    ...(filters.especialidade !== 'Todas' ? { specialty: { contains: filters.especialidade } } : {}),
    ...(filters.modalidade === 'Online' ? { modality: { in: ['ONLINE', 'AMBOS'] } } : {}),
    ...(filters.modalidade === 'Presencial' ? { modality: { in: ['PRESENCIAL', 'AMBOS'] } } : {}),
    ...(filters.q
      ? {
          OR: [
            { user: { name: { contains: filters.q } } },
            { specialty: { contains: filters.q } },
            { city: { contains: filters.q } },
          ],
        }
      : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.professional.findMany({
      where,
      include: PROFESSIONAL_CARD_INCLUDE,
      orderBy: filters.ordenar === 'preco' ? { price: 'asc' } : { rating: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.professional.count({ where }),
  ])

  const results = rows.map(toProfessionalCard)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const pageHref = (p: number) => {
    const qs = new URLSearchParams()
    if (filters.q) qs.set('q', filters.q)
    if (filters.especialidade !== 'Todas') qs.set('especialidade', filters.especialidade)
    if (filters.modalidade !== 'Todas') qs.set('modalidade', filters.modalidade)
    if (filters.precoMax !== 250) qs.set('precoMax', String(filters.precoMax))
    if (filters.avaliacaoMin) qs.set('avaliacaoMin', String(filters.avaliacaoMin))
    if (filters.ordenar !== 'avaliacao') qs.set('ordenar', filters.ordenar)
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

            <div className="space-y-4">
              {results.map((n) => (
                <div key={n.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 ${n.color} text-white rounded-full flex items-center justify-center text-lg font-bold shrink-0`}>
                      {n.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h3 className="font-bold text-gray-900">{n.name}</h3>
                          <p className="text-sm text-gray-500">{n.specialty}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1">
                              <Star size={13} className="text-yellow-400 fill-yellow-400" />
                              <span className="text-xs font-bold text-gray-700">{n.rating}</span>
                              <span className="text-xs text-gray-400">({n.reviewCount})</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin size={12} /> {n.city}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              {n.modality !== 'PRESENCIAL' ? <Video size={12} /> : <Users size={12} />}
                              {n.modalityLabel}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">R$ {n.price}</p>
                            <p className="text-xs text-gray-400">/consulta</p>
                          </div>
                          <Link
                            href={`/perfil/${n.id}`}
                            className="bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-emerald-600 transition-colors"
                          >
                            Ver perfil
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
