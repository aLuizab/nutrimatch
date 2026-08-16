import Link from 'next/link'
import { Star, ArrowRight, CheckCircle, Clock, ChevronRight, Search } from 'lucide-react'
import PublicHeader from './components/PublicHeader'
import HeroSearch from './HeroSearch'
import { prisma } from '@/lib/prisma'
import { PROFESSIONAL_CARD_INCLUDE, toProfessionalCard } from '@/lib/professionals'

const specialties = [
  { label: 'Esportiva', emoji: '🏃', color: 'bg-orange-50 text-orange-600 border-orange-100' },
  { label: 'Clínica', emoji: '🩺', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { label: 'Funcional', emoji: '🌿', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { label: 'Infantil', emoji: '👶', color: 'bg-pink-50 text-pink-600 border-pink-100' },
  { label: 'Vegana', emoji: '🥦', color: 'bg-green-50 text-green-600 border-green-100' },
  { label: 'Oncológica', emoji: '💜', color: 'bg-purple-50 text-purple-600 border-purple-100' },
]

const steps = [
  { step: '1', title: 'Busque', description: 'Pesquise por especialidade, localização ou disponibilidade sem precisar de cadastro.', icon: Search },
  { step: '2', title: 'Escolha', description: 'Compare perfis, avaliações e preços para encontrar o profissional ideal para você.', icon: CheckCircle },
  { step: '3', title: 'Agende', description: 'Marque sua consulta diretamente pela plataforma. Simples, rápido e sem burocracia.', icon: Clock },
]

export default async function LandingPage() {
  const [featuredRows, totalActive] = await Promise.all([
    prisma.professional.findMany({
      where: { status: 'ACTIVE' },
      include: PROFESSIONAL_CARD_INCLUDE,
      orderBy: { rating: 'desc' },
      take: 6,
    }),
    prisma.professional.count({ where: { status: 'ACTIVE' } }),
  ])
  const featured = featuredRows.map(toProfessionalCard)

  return (
    <div className="min-h-screen bg-white font-sans">
      <PublicHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-50 via-white to-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-bold px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase">
              {totalActive > 0 ? `Mais de ${totalActive} especialistas cadastrados` : 'Encontre seu nutricionista ideal'}
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Encontre o seu{' '}
              <span className="text-emerald-500">Nutricionista</span> ideal
            </h1>
            <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-xl mx-auto">
              Conectamos você a profissionais qualificados. Agende consultas online ou presenciais sem burocracia.
            </p>

            <HeroSearch />

            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {specialties.map((s) => (
                <Link
                  key={s.label}
                  href={`/resultados?especialidade=${s.label}`}
                  className={`flex items-center gap-1.5 border px-4 py-1.5 rounded-full text-xs font-medium hover:scale-105 transition-transform ${s.color}`}
                >
                  <span>{s.emoji}</span> {s.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: `${totalActive}+`, label: 'Nutricionistas' },
            { value: '5.000+', label: 'Pacientes atendidos' },
            { value: '4.9', label: 'Avaliação média' },
            { value: '98%', label: 'Satisfação' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Como funciona</h2>
            <p className="text-gray-500 mt-3 text-lg">Simples, rápido e sem complicação</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map(({ step, title, description }) => (
              <div key={step} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-5">
                  {step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Profissionais em destaque */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Profissionais em destaque</h2>
              <p className="text-gray-500 mt-2">Especialistas com as melhores avaliações</p>
            </div>
            <Link href="/resultados" className="hidden md:flex items-center gap-2 text-emerald-600 font-medium text-sm hover:underline">
              Ver todos <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((n) => (
              <div key={n.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
                <div className="flex gap-4 items-start">
                  <div className={`w-14 h-14 ${n.color} text-white rounded-full flex items-center justify-center text-lg font-bold shrink-0`}>
                    {n.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900">{n.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{n.specialty}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Star size={13} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-bold text-gray-700">{n.rating}</span>
                      <span className="text-xs text-gray-400">({n.reviewCount} aval.)</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">{n.modalityLabel}</p>
                    <p className="text-base font-bold text-gray-900 mt-0.5">
                      R$ {n.price} <span className="text-xs text-gray-400 font-normal">/consulta</span>
                    </p>
                  </div>
                  <Link
                    href={`/perfil/${n.id}`}
                    className="bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-full hover:bg-emerald-600 transition-colors"
                  >
                    Ver perfil
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8 md:hidden">
            <Link href="/resultados" className="inline-flex items-center gap-2 text-emerald-600 font-medium border border-emerald-200 px-6 py-3 rounded-xl hover:bg-emerald-50">
              Ver todos os especialistas <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA profissional */}
      <section className="bg-emerald-500 py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Você é nutricionista?</h2>
          <p className="text-emerald-100 text-lg mb-8">
            Crie seu perfil e comece a receber pacientes pela plataforma
          </p>
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-2 bg-white text-emerald-600 font-bold px-8 py-4 rounded-2xl hover:bg-emerald-50 transition-colors shadow-lg"
          >
            Criar perfil profissional <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <p className="text-xl font-bold text-white">
              Nutri<span className="text-emerald-400">Match</span>
            </p>
            <p className="text-sm mt-1">Conectando saúde e bem-estar</p>
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/resultados" className="hover:text-white transition-colors">Especialistas</Link>
            <Link href="/login" className="hover:text-white transition-colors">Entrar</Link>
            <Link href="/cadastro" className="hover:text-white transition-colors">Cadastrar</Link>
          </div>
          <p className="text-xs">© 2026 NutriMatch</p>
        </div>
      </footer>
    </div>
  )
}
