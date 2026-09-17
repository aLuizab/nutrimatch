import Link from 'next/link'
import { ArrowRight, CheckCircle2, Clock, ChevronRight, Search, ShieldCheck, CalendarCheck, Star, Quote } from 'lucide-react'
import PublicHeader from './components/PublicHeader'
import RatingStat from './components/RatingStat'
import HeroSearch from './HeroSearch'
import { prisma } from '@/lib/prisma'
import { PROFESSIONAL_CARD_INCLUDE, toProfessionalCard } from '@/lib/professionals'
import { SPECIALTIES } from '@/lib/specialties'

const steps = [
  { step: '1', title: 'Busque', description: 'Filtre por especialidade, cidade, preço e modalidade. Sem cadastro para pesquisar.', icon: Search },
  { step: '2', title: 'Compare', description: 'Veja perfis completos, formação, avaliações reais de pacientes e valor da consulta.', icon: CheckCircle2 },
  { step: '3', title: 'Agende', description: 'Escolha um horário livre na agenda do profissional e confirme em poucos cliques.', icon: CalendarCheck },
]

const trustPoints = [
  { icon: ShieldCheck, title: 'Profissionais verificados', text: 'Todo nutricionista passa por aprovação da nossa equipe antes de aparecer na busca.' },
  { icon: Clock, title: 'Agenda em tempo real', text: 'Você vê apenas horários realmente livres — sem troca de mensagens para marcar.' },
  { icon: Star, title: 'Avaliações de verdade', text: 'Só quem teve consulta pela plataforma pode avaliar. Nada de nota inflada.' },
]

// Renderizada a cada request, não gerada no build.
//
// A vitrine da home sai do banco (profissionais em destaque, ordenados por rankScore), e sem
// isto o Next tenta gerar esta página estaticamente durante `next build` — onde não existe
// banco nenhum para consultar. Era exatamente o que quebrava o deploy: o build morria em
// "Error occurred prerendering page /" com falha de autenticação no Postgres.
//
// Além de destravar o build, é o comportamento correto: a lista muda conforme novos
// profissionais entram e conforme o ranking é recalculado, então congelá-la no build mostraria
// uma vitrine velha até o próximo deploy.
export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const now = new Date()
  const [featuredRows, totalActive, consultasRealizadas, ratingAgg, testimonialRows] = await Promise.all([
    prisma.professional.findMany({
      where: { status: 'ACTIVE' },
      include: PROFESSIONAL_CARD_INCLUDE,
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: 6,
    }),
    prisma.professional.count({ where: { status: 'ACTIVE' } }),
    prisma.appointment.count({ where: { status: 'CONFIRMED', scheduledAt: { lt: now } } }),
    prisma.review.aggregate({ _avg: { rating: true }, _count: true }),
    prisma.review.findMany({
      where: { rating: 5 },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        patient: { include: { user: { select: { name: true } } } },
        professional: { include: { user: { select: { name: true } } } },
      },
    }),
  ])

  const featured = featuredRows.map(toProfessionalCard)

  // Every stat is real, and one with too little data behind it is hidden rather than
  // padded with an invented number.
  const stats = [
    totalActive >= 5 ? { value: String(totalActive), label: totalActive === 1 ? 'Nutricionista' : 'Nutricionistas' } : null,
    consultasRealizadas >= 20 ? { value: String(consultasRealizadas), label: 'Consultas realizadas' } : null,
    ratingAgg._count >= 5 && ratingAgg._avg.rating
      ? { value: ratingAgg._avg.rating.toFixed(1), label: 'Avaliação média' }
      : null,
    ratingAgg._count >= 5 ? { value: String(ratingAgg._count), label: 'Avaliações de pacientes' } : null,
  ].filter((s): s is { value: string; label: string } => s !== null)

  return (
    <div className="min-h-screen bg-white font-sans">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/80 via-white to-white">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-50 rounded-full blur-3xl" aria-hidden />

        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center">
            {totalActive >= 10 && (
              <span className="inline-flex items-center gap-2 bg-white border border-emerald-100 text-emerald-700 text-xs font-bold px-4 py-2 rounded-full mb-6 shadow-sm">
                <ShieldCheck size={14} />
                {totalActive} nutricionistas verificados na plataforma
              </span>
            )}
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-[1.1] mb-6">
              O nutricionista certo para
              <span className="block text-emerald-500">o seu objetivo</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
              Compare especialistas por preço, avaliação e disponibilidade. Agende online ou presencial em minutos.
            </p>

            <HeroSearch />

            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {SPECIALTIES.map((s) => (
                <Link
                  key={s.long}
                  href={`/resultados?especialidade=${encodeURIComponent(s.short)}`}
                  className={`flex items-center gap-1.5 border px-4 py-1.5 rounded-full text-xs font-medium hover:scale-105 transition-transform ${s.color}`}
                >
                  <span>{s.emoji}</span> {s.short}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats — only rendered when there's enough real data to be meaningful */}
      {stats.length >= 2 && (
        <section className="border-y border-gray-100 bg-white">
          <div className={`max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 gap-8 ${stats.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Como funciona */}
      <section id="como-funciona" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Como funciona</h2>
            <p className="text-gray-500 mt-3 text-lg">Do primeiro clique à consulta marcada</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map(({ step, title, description, icon: Icon }) => (
              <div key={step} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">Passo {step}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Por que confiar */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
          {trustPoints.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon size={22} className="text-emerald-500 mb-3" />
              <h3 className="font-bold text-gray-900 mb-1.5">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Profissionais em destaque */}
      {featured.length > 0 && (
        <section className="py-20 bg-gray-50">
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
                <Link
                  key={n.id}
                  href={`/perfil/${n.id}`}
                  className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all block"
                >
                  <div className="flex gap-4 items-start">
                    <div className={`w-14 h-14 ${n.color} text-white rounded-full flex items-center justify-center text-lg font-bold shrink-0`}>
                      {n.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{n.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{n.specialtyLabel}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <RatingStat rating={n.rating} reviewCount={n.reviewCount} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">{n.modalityLabel} · {n.city}</p>
                      <p className="text-base font-bold text-gray-900 mt-0.5">
                        R$ {n.price} <span className="text-xs text-gray-400 font-normal">/consulta</span>
                      </p>
                    </div>
                    <span className="bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-full">Ver perfil</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-8 md:hidden">
              <Link href="/resultados" className="inline-flex items-center gap-2 text-emerald-600 font-medium border border-emerald-200 px-6 py-3 rounded-xl hover:bg-emerald-50">
                Ver todos os especialistas <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Depoimentos reais — escondido enquanto não houver avaliações 5 estrelas */}
      {testimonialRows.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">O que dizem os pacientes</h2>
              <p className="text-gray-500 mt-3">Avaliações de quem se consultou pela plataforma</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonialRows.map((r) => (
                <div key={r.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 relative">
                  <Quote size={28} className="text-emerald-200 absolute top-5 right-5" aria-hidden />
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} size={13} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed mb-4">“{r.comment}”</p>
                  <p className="text-xs text-gray-500">
                    <span className="font-bold text-gray-700">{r.patient.user.name.split(' ')[0]}</span>
                    {' '}· consulta com {r.professional.user.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA profissional */}
      <section className="bg-emerald-500 py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Você é nutricionista?</h2>
          <p className="text-emerald-100 text-lg mb-8 max-w-xl mx-auto">
            Crie seu perfil, defina seus horários e seu valor, e comece a receber agendamentos sem pagar taxa de cadastro.
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
