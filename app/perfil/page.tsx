'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Star, CheckCircle2, MapPin, Video, Clock, Share2, Heart } from 'lucide-react'
import PublicHeader from '../components/PublicHeader'

const reviews = [
  { name: 'Marcos A.', rating: 5, text: 'Excelente profissional! Mudou completamente minha relação com a alimentação. Superou todas as expectativas.', date: 'Há 2 semanas' },
  { name: 'Fernanda L.', rating: 5, text: 'Muito atenciosa e detalhista. O plano alimentar foi personalizado de verdade para meu estilo de vida.', date: 'Há 1 mês' },
  { name: 'Ricardo M.', rating: 4, text: 'Ótimo atendimento, plano bem estruturado. Já perdi 8kg em 3 meses seguindo as orientações.', date: 'Há 2 meses' },
]

const slots = [
  { day: 'Seg', date: '02', times: ['09:00', '10:00', '15:00'] },
  { day: 'Ter', date: '03', times: ['08:30', '14:30', '16:00'] },
  { day: 'Qua', date: '04', times: ['09:00', '11:00', '15:30'] },
  { day: 'Qui', date: '05', times: ['10:00', '14:00'] },
]

export default function PerfilProfissional() {
  const [liked, setLiked] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)

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
            {/* Card do perfil */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-emerald-400 to-emerald-600" />
              <div className="px-8 pb-8">
                <div className="flex items-end justify-between -mt-10 mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 bg-white border-4 border-white rounded-full flex items-center justify-center text-2xl font-bold text-emerald-600 bg-emerald-100 shadow-md">
                      CM
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow">
                      <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-50" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLiked(!liked)}
                      className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <Heart size={18} className={liked ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
                    </button>
                    <button className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                      <Share2 size={18} className="text-gray-400" />
                    </button>
                  </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900">Dra. Carolina Matos</h1>
                <p className="text-gray-500 mt-1">CRN-3 · 12.345 · Nutricionista</p>

                <div className="flex flex-wrap items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-gray-900">4.9</span>
                    <span className="text-sm text-gray-500 underline cursor-pointer">47 avaliações</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin size={14} /> São Paulo, SP
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Video size={14} /> Online e Presencial
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {['Nutrição Esportiva', 'Performance', 'Emagrecimento', 'Hipertrofia'].map((tag) => (
                    <span key={tag} className="bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full border border-emerald-100">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sobre */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-3">Sobre a profissional</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Especialista em nutrição esportiva e funcional com mais de 8 anos de experiência. Formada pela USP com pós-graduação em Nutrição Esportiva pelo GANEP. Atendo atletas amadores e profissionais, auxiliando no ganho de performance, composição corporal e saúde geral.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                Minha abordagem é individualizada e baseada em evidências científicas, sempre considerando a rotina e objetivos de cada paciente. Acredito que a alimentação deve ser prazerosa e sustentável a longo prazo.
              </p>
            </div>

            {/* Formação */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Formação e Certificações</h2>
              <div className="space-y-3">
                {[
                  { title: 'Pós-graduação em Nutrição Esportiva', sub: 'GANEP · 2018' },
                  { title: 'Bacharelado em Nutrição', sub: 'Universidade de São Paulo (USP) · 2015' },
                  { title: 'Certificação em Avaliação Nutricional', sub: 'ISAK · 2019' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Avaliações */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold text-gray-900">Avaliações dos pacientes</h2>
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-yellow-400 fill-yellow-400" />
                  <span className="font-bold text-gray-900 text-lg">4.9</span>
                  <span className="text-sm text-gray-500">· 47 avaliações</span>
                </div>
              </div>
              <div className="space-y-5">
                {reviews.map((r) => (
                  <div key={r.name} className="border-b border-gray-50 pb-5 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                          {r.name[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{r.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} size={12} className="text-yellow-400 fill-yellow-400" />
                        ))}
                        <span className="text-xs text-gray-400 ml-1">{r.date}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar de agendamento */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24 space-y-5">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">R$ 150</p>
                <p className="text-sm text-gray-500 mt-0.5">/consulta individual</p>
              </div>

              <div className="space-y-2">
                {[
                  { icon: Clock, text: 'Consulta de 50 minutos' },
                  { icon: Video, text: 'Atendimento online e presencial' },
                  { icon: CheckCircle2, text: 'Retorno incluso em 30 dias' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-xs text-gray-600">
                    <Icon size={14} className="text-emerald-500 shrink-0" />
                    {text}
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Próximas disponibilidades</p>
                <div className="flex gap-2 mb-3">
                  {slots.map((slot, i) => (
                    <button
                      key={slot.day}
                      onClick={() => setSelectedDay(i)}
                      className={`flex-1 flex flex-col items-center py-2 rounded-xl border text-xs font-medium transition-colors ${
                        selectedDay === i ? 'bg-emerald-500 text-white border-emerald-500' : 'border-gray-200 text-gray-600 hover:border-emerald-300'
                      }`}
                    >
                      <span>{slot.day}</span>
                      <span className="text-base font-bold">{slot.date}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {slots[selectedDay].times.map((t) => (
                    <button
                      key={t}
                      className="py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <Link
                href="/agendamento"
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
