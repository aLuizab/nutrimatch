import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Star, CheckCircle2, MapPin, Video, Clock, Users } from 'lucide-react'
import PublicHeader from '../../components/PublicHeader'
import { prisma } from '@/lib/prisma'
import { avatarColor, formatDateBR, formatPrice, formatTimeBR, initials, modalityLabel, relativeTimeBR } from '@/lib/format'
import { getAvailableSlots } from '@/lib/availability'

export default async function PerfilProfissional({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const professional = await prisma.professional.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { patient: { include: { user: { select: { name: true } } } } },
      },
      availabilityRules: true,
    },
  })

  // Guard repeated here (not just in search) so a suspended professional's page/booking
  // flow isn't reachable by anyone who has or guesses the URL.
  if (!professional || professional.status !== 'ACTIVE') {
    notFound()
  }

  const days = await getAvailableSlots(id, 4)
  const slotMinutes = professional.availabilityRules[0]?.slotMinutes ?? 50
  const name = professional.user.name
  const color = avatarColor(professional.id)

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PublicHeader />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Link href="/resultados" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft size={16} /> Voltar aos resultados
        </Link>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Coluna principal */}
          <div className="flex-1 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-emerald-400 to-emerald-600" />
              <div className="px-8 pb-8">
                <div className="flex items-end justify-between -mt-10 mb-6">
                  <div className="relative">
                    <div className={`w-20 h-20 bg-white border-4 border-white rounded-full flex items-center justify-center text-2xl font-bold text-white ${color} shadow-md`}>
                      {initials(name)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow">
                      <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-50" />
                    </div>
                  </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
                <p className="text-gray-500 mt-1">{professional.crn} · Nutricionista</p>

                <div className="flex flex-wrap items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-gray-900">{professional.rating.toFixed(1)}</span>
                    <span className="text-sm text-gray-500">{professional.reviewCount} avaliações</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin size={14} /> {professional.city}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Video size={14} /> {modalityLabel(professional.modality)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full border border-emerald-100">
                    {professional.specialty}
                  </span>
                </div>
              </div>
            </div>

            {professional.bio && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-3">Sobre a profissional</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{professional.bio}</p>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold text-gray-900">Avaliações dos pacientes</h2>
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-yellow-400 fill-yellow-400" />
                  <span className="font-bold text-gray-900 text-lg">{professional.rating.toFixed(1)}</span>
                  <span className="text-sm text-gray-500">· {professional.reviewCount} avaliações</span>
                </div>
              </div>
              {professional.reviews.length === 0 ? (
                <p className="text-sm text-gray-400">Ainda não há avaliações públicas.</p>
              ) : (
                <div className="space-y-5">
                  {professional.reviews.map((r) => (
                    <div key={r.id} className="border-b border-gray-50 pb-5 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                            {r.patient.user.name[0]}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{r.patient.user.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} size={12} className="text-yellow-400 fill-yellow-400" />
                          ))}
                          <span className="text-xs text-gray-400 ml-1">{relativeTimeBR(r.createdAt)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar de agendamento */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24 space-y-5">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{formatPrice(professional.price)}</p>
                <p className="text-sm text-gray-500 mt-0.5">/consulta individual</p>
              </div>

              <div className="space-y-2">
                {[
                  { icon: Clock, text: `Consulta de ${slotMinutes} minutos` },
                  { icon: professional.modality === 'PRESENCIAL' ? Users : Video, text: `Atendimento ${modalityLabel(professional.modality).toLowerCase()}` },
                  { icon: CheckCircle2, text: 'Perfil verificado pela NutriMatch' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-xs text-gray-600">
                    <Icon size={14} className="text-emerald-500 shrink-0" />
                    {text}
                  </div>
                ))}
              </div>

              {days.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Próximas disponibilidades</p>
                  <div className="space-y-3">
                    {days.map((day) => (
                      <div key={day.dateStr}>
                        <p className="text-xs font-medium text-gray-500 mb-1.5">{formatDateBR(day.date)}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {day.times.slice(0, 6).map((t) => (
                            <Link
                              key={t.toISOString()}
                              href={`/agendamento/${id}?horario=${encodeURIComponent(t.toISOString())}`}
                              className="py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-center"
                            >
                              {formatTimeBR(t)}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Link
                href={`/agendamento/${id}`}
                className="w-full block text-center bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 transition-colors shadow-sm"
              >
                Agendar consulta
              </Link>

              <p className="text-center text-xs text-gray-400">Sem cobranças até confirmar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
