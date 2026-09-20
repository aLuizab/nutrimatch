import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle2, ChevronRight, Search, ShieldCheck, CalendarCheck, Star, Quote } from 'lucide-react'
import PublicHeader from './components/PublicHeader'
import FaixaFetin from './FaixaFetin'
import RatingStat from './components/RatingStat'
import HeroSearch from './HeroSearch'
import Revelar from './components/Revelar'
import Contador from './components/Contador'
import ParaQuemE from './ParaQuemE'
import DemoBusca, { type DemoProfissional } from './DemoBusca'
import CartoesFlutuantes from './CartoesFlutuantes'
import { PRO_PLAN_SLUG } from '@/lib/subscription'
import { formatCents } from '@/lib/money'
import { avatarColor, initials } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { listedWhere } from '@/lib/subscription'
import { PROFESSIONAL_CARD_INCLUDE, toProfessionalCard } from '@/lib/professionals'
import { SPECIALTIES } from '@/lib/specialties'

// Perfis de exemplo, usados só enquanto nenhum profissional real está publicado. Os nomes são
// fictícios e não correspondem a ninguém — os cartões e a prévia dizem isso na tela, porque
// nome e nota inventados sem aviso viram promessa que o produto não cumpre.
const EXEMPLOS: DemoProfissional[] = [
  { id: null, nome: 'Dra. Helena Duarte', especialidade: 'Nutrição Esportiva', rating: 0, reviewCount: 0, preco: 150, cidade: 'São Paulo, SP', online: true, iniciais: 'HD', cor: 'bg-orange-500' },
  { id: null, nome: 'Dr. Marcos Vilela', especialidade: 'Nutrição Clínica', rating: 0, reviewCount: 0, preco: 120, cidade: 'Belo Horizonte, MG', online: false, iniciais: 'MV', cor: 'bg-blue-500' },
  { id: null, nome: 'Dra. Priscila Tavares', especialidade: 'Nutrição Infantil', rating: 0, reviewCount: 0, preco: 140, cidade: 'Curitiba, PR', online: true, iniciais: 'PT', cor: 'bg-purple-500' },
]

const steps = [
  { step: '1', title: 'Busque', description: 'Filtre por especialidade, cidade, preço e modalidade. Sem cadastro para pesquisar.', icon: Search },
  { step: '2', title: 'Compare', description: 'Veja perfis completos, formação, avaliações reais de pacientes e valor da consulta.', icon: CheckCircle2 },
  { step: '3', title: 'Agende', description: 'Escolha um horário livre na agenda do profissional e confirme em poucos cliques.', icon: CalendarCheck },
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
  const [featuredRows, totalActive, consultasRealizadas, ratingAgg, planoPro, testimonialRows] = await Promise.all([
    prisma.professional.findMany({
      // Featured obeys the same paywall as the search: a professional nobody can book should
      // not be the first thing a patient sees on the home page.
      where: { status: 'ACTIVE', ...listedWhere() },
      include: PROFESSIONAL_CARD_INCLUDE,
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: 6,
    }),
    prisma.professional.count({ where: { status: 'ACTIVE', ...listedWhere() } }),
    prisma.appointment.count({ where: { status: 'CONFIRMED', scheduledAt: { lt: now } } }),
    prisma.review.aggregate({ _avg: { rating: true }, _count: true }),
    prisma.subscriptionPlan.findUnique({ where: { slug: PRO_PLAN_SLUG } }),
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

  const mensalidade = planoPro ? `${formatCents(planoPro.monthlyPrice)}/mês` : 'R$ 9,90/mês'

  // A prévia da busca e os cartões do topo usam profissionais reais. Enquanto não houver
  // nenhum publicado, entram exemplos declarados como tal na própria tela — inventar nome e
  // nota sem dizer que são inventados é o começo de uma página que promete o que não entrega.
  const ilustrativo = featuredRows.length === 0
  const demoProfissionais: DemoProfissional[] = ilustrativo
    ? EXEMPLOS
    : featuredRows.map((p) => ({
        id: p.id,
        nome: p.user.name,
        especialidade: p.specialties[0] ?? 'Nutrição',
        rating: p.rating,
        reviewCount: p.reviewCount,
        preco: p.price,
        cidade: p.city,
        online: p.modality !== 'PRESENCIAL',
        iniciais: initials(p.user.name),
        cor: avatarColor(p.id),
      }))

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
      <FaixaFetin />
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/80 via-white to-white">
        {/* A malha de pontos esmaece para baixo, senão ela compete com o conteúdo em vez de
            servir de textura. */}
        <div
          className="absolute inset-0 bg-pontilhado [mask-image:linear-gradient(to_bottom,black_35%,transparent)]"
          aria-hidden
        />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-50 rounded-full blur-3xl" aria-hidden />

        <CartoesFlutuantes profissionais={demoProfissionais} />

        <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Texto e busca. Alinhado à esquerda no desktop e centralizado no mobile, onde
                não há imagem ao lado para equilibrar. */}
            <div className="text-center lg:text-left">
              {totalActive >= 10 && (
                <span className="inline-flex items-center gap-2 bg-white border border-emerald-100 text-emerald-700 text-xs font-bold px-4 py-2 rounded-full mb-6 shadow-sm">
                  <ShieldCheck size={14} />
                  {totalActive} nutricionistas verificados na plataforma
                </span>
              )}
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-[1.1] mb-6">
                O nutricionista certo para
                <span className="block text-emerald-600 brilho-marca tracking-tightest">o seu objetivo</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Compare especialistas por preço, avaliação e disponibilidade. Agende online ou presencial em minutos.
              </p>

              <HeroSearch />

              <div className="flex flex-wrap gap-2 justify-center lg:justify-start mt-6">
                {SPECIALTIES.map((s, i) => (
                  <Link
                    key={s.long}
                    href={`/resultados?especialidade=${encodeURIComponent(s.short)}`}
                    // O atraso por índice faz os chips subirem e descerem fora de sincronia. Em
                    // fase, viram um bloco só piscando; defasados, parecem vivos.
                    style={{ animationDelay: `${i * 260}ms` }}
                    className={`flutuar flex items-center gap-1.5 border px-4 py-1.5 rounded-full text-xs font-medium hover:scale-105 transition-transform ${s.color}`}
                  >
                    <span>{s.emoji}</span> {s.short}
                  </Link>
                ))}
              </div>
            </div>

            {/* Escondida no celular de propósito: numa tela estreita a imagem empurraria a
                busca para baixo da dobra, e procurar nutricionista é o que a pessoa veio
                fazer. Foto do Pexels, servida do nosso domínio — hotlink dependeria de um
                terceiro no meio do carregamento e entregaria o IP de cada visitante a ele. */}
            <div className="hidden lg:block relative">
              <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-emerald-900/10 rotate-1">
                <Image
                  src="/hero-prato.jpg"
                  alt="Prato equilibrado com grão-de-bico, abóbora assada, folhas, quinoa e abacate"
                  width={1200}
                  height={900}
                  priority
                  className="w-full h-auto object-cover"
                />
              </div>

              <div className="absolute -bottom-5 -left-5 bg-white rounded-2xl shadow-lg border border-gray-100 px-5 py-4 -rotate-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <CalendarCheck size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Online ou presencial</p>
                    <p className="text-xs text-gray-500">Você escolhe como quer ser atendido</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats — only rendered when there's enough real data to be meaningful */}
      {stats.length >= 2 && (
        <section className="border-y border-gray-100 bg-white">
          <div className={`max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 gap-8 ${stats.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
            {stats.map((stat, i) => (
              <Revelar key={stat.label} atraso={i * 90} className="text-center">
                <p className="text-3xl font-bold text-gray-900">
                  <Contador valor={stat.value} />
                </p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </Revelar>
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
              <Revelar
              key={step}
              atraso={(Number(step) - 1) * 110}
              className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm elevar-no-hover hover:border-emerald-200"
            >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">Passo {step}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
            </Revelar>
            ))}
          </div>
        </div>
      </section>

      <ParaQuemE mensalidade={mensalidade} />

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
                  className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:border-emerald-200 elevar-no-hover block"
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

      <DemoBusca profissionais={demoProfissionais} ilustrativo={ilustrativo} />

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
          <p className="text-xs text-center md:text-right">
            © 2026 NutriMatch
            <span className="block mt-1">
              Projeto da{' '}
              <a
                href="https://inatel.br/fetin/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white transition-colors underline underline-offset-2"
              >
                FETIN 2026 · Inatel
              </a>
            </span>
          </p>
        </div>
      </footer>
    </div>
  )
}
