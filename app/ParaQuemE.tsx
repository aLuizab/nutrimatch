'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

/**
 * As duas audiências da plataforma, em abas.
 *
 * Alternar no cliente em vez de linkar para outra página: são dois recortes do mesmo assunto, e
 * mandar quem está decidindo para outra URL só para ver a outra metade custa um carregamento e
 * o lugar onde a pessoa estava na rolagem.
 */
const PACIENTE = [
  {
    emoji: '📍',
    titulo: 'Busca por cidade',
    texto:
      'Encontre nutricionistas que atendem na sua cidade, com filtro por especialidade, preço e modalidade.',
    href: '/resultados',
  },
  {
    emoji: '🔍',
    titulo: 'Filtros que importam',
    texto: 'Especialidade, valor da consulta, atendimento online ou presencial e avaliação mínima.',
    href: '/resultados',
  },
  {
    emoji: '📅',
    titulo: 'Agendamento direto',
    texto: 'Escolha um horário livre na agenda e confirme pela plataforma, sem ligação nem WhatsApp.',
    href: '/resultados',
  },
  {
    emoji: '⭐',
    titulo: 'Avaliações verificadas',
    texto: 'Só quem teve consulta pela plataforma pode avaliar. Não existe nota comprada aqui.',
    href: '/como-funciona-profissional',
  },
  {
    emoji: '🔔',
    titulo: 'Lembretes por e-mail',
    texto: 'Aviso antes da consulta, confirmação de pagamento e qualquer mudança no agendamento.',
    href: null,
  },
  {
    emoji: '🎯',
    titulo: 'Metas e evolução',
    texto: 'Defina objetivos com prazo, registre seu progresso e acompanhe junto do profissional.',
    href: '/cadastro',
  },
]

const PROFISSIONAL = [
  {
    emoji: '👤',
    titulo: 'Perfil profissional',
    texto: 'Foto, CRN verificado, especialidades, bio e valor da consulta numa página que converte.',
    href: '/cadastro',
  },
  {
    emoji: '📊',
    titulo: 'Painel de gestão',
    texto: 'Agenda do dia, consultas do mês, receita e sua reputação, num lugar só.',
    href: '/como-funciona-profissional',
  },
  {
    emoji: '🗓️',
    titulo: 'Gestão de agenda',
    texto: 'Defina seus horários por dia da semana. O paciente só vê o que está realmente livre.',
    href: '/como-funciona-profissional',
  },
  {
    emoji: '💚',
    titulo: 'Reputação que rende',
    texto: 'Comparecimento, resposta rápida e boas avaliações sobem seu perfil na busca.',
    href: '/como-funciona-profissional',
  },
  {
    emoji: '💸',
    titulo: 'Recebimento por Pix',
    texto: 'O paciente paga a plataforma, e você recebe na sua chave Pix já descontada a taxa.',
    href: '/como-funciona-profissional',
  },
  {
    emoji: '✅',
    titulo: 'CRN conferido',
    texto: 'Todo cadastro passa por verificação no conselho antes de aparecer para pacientes.',
    href: '/cadastro',
  },
]

export default function ParaQuemE({ mensalidade }: { mensalidade: string }) {
  const [aba, setAba] = useState<'paciente' | 'profissional'>('paciente')
  const itens = aba === 'paciente' ? PACIENTE : PROFISSIONAL

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between gap-8 flex-wrap mb-10">
          <div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg mb-5">
              Para quem é
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-[1.15] tracking-tightest">
              Tudo que você precisa
              <span className="block">em uma plataforma</span>
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Escolha o público"
            className="inline-flex bg-gray-100 border border-gray-200 rounded-xl p-1"
          >
            {(
              [
                ['paciente', 'Para Pacientes'],
                ['profissional', 'Para Profissionais'],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                role="tab"
                aria-selected={aba === valor}
                onClick={() => setAba(valor)}
                className={`text-sm font-bold px-5 py-2.5 rounded-lg transition-all ${
                  aba === valor
                    ? 'bg-surface text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {itens.map((item, i) => {
            const conteudo = (
              <>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl mb-4">
                  {item.emoji}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-gray-900">{item.titulo}</h3>
                  {item.href && <ChevronRight size={16} className="text-gray-300 shrink-0" />}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed mt-2">{item.texto}</p>
              </>
            )

            // A chave inclui a aba para o React remontar os cartões ao trocar de público —
            // sem isso ele reaproveita os nós e a troca acontece sem nenhuma transição.
            const classe =
              'bg-surface border border-gray-100 rounded-2xl p-6 elevar-no-hover hover:border-emerald-200 block'

            return item.href ? (
              <Link key={`${aba}-${i}`} href={item.href} className={classe}>
                {conteudo}
              </Link>
            ) : (
              <div key={`${aba}-${i}`} className={classe}>
                {conteudo}
              </div>
            )
          })}
        </div>

        {aba === 'profissional' && (
          <p className="text-sm text-gray-500 mt-6">
            Cadastro gratuito. Para aparecer na busca e receber agendamentos, a mensalidade é de{' '}
            <strong className="text-gray-900">{mensalidade}</strong>.
          </p>
        )}
      </div>
    </section>
  )
}
