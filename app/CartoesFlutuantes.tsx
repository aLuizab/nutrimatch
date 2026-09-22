import { MapPin, Star, UserRound, Video } from 'lucide-react'
import type { DemoProfissional } from './DemoBusca'

/**
 * Os cartões espalhados ao redor do título do topo.
 *
 * Só aparecem em telas largas (`hidden xl:block`): numa tela estreita eles cobririam o próprio
 * título que deveriam emoldurar, e a busca é o que a pessoa veio fazer.
 *
 * `pointer-events-none` no contêiner e `aria-hidden` porque isto é enfeite — um leitor de tela
 * anunciando três perfis decorativos antes do título atrapalha, e um cartão sob o cursor
 * roubando o clique do botão de busca atrapalha ainda mais.
 *
 * ── Sem nome, e sem iniciais ──────────────────────────────────────────────────────────────
 * Estes cartões vêm de `prisma.professional.findMany`: são pessoas reais, não exemplos. Usar o
 * nome de alguém como enfeite do topo é exposição sem nenhum fluxo de consentimento por trás,
 * e num marketplace de saúde isso pesa mais do que em outro lugar.
 *
 * As iniciais saíram junto pelo mesmo motivo: "AF" ao lado de "Nutrição Esportiva" e "Itajubá"
 * identifica tão bem quanto o nome inteiro numa cidade pequena. O que sobra é o que o cartão
 * realmente precisa dizer — que existe gente atendendo naquela especialidade, perto ou online.
 *
 * A cor do avatar continua vindo do profissional, para os três cartões não ficarem iguais.
 */
const POSICOES = [
  'top-[14%] left-[2%]',
  'top-[18%] right-[2%]',
  'bottom-[18%] left-[5%]',
]

const PILULAS = [
  { rotulo: 'Perto de você', emoji: '📍', pos: 'top-[4%] left-[26%]' },
  { rotulo: 'Online', emoji: '💻', pos: 'top-[5%] right-[24%]' },
  { rotulo: 'Vegana', emoji: '🥦', pos: 'bottom-[34%] right-[3%]' },
  { rotulo: 'Esportiva', emoji: '🏃', pos: 'bottom-[9%] right-[13%]' },
]

export default function CartoesFlutuantes({ profissionais }: { profissionais: DemoProfissional[] }) {
  const mostrados = profissionais.slice(0, 3)

  return (
    <div className="hidden xl:block absolute inset-0 pointer-events-none" aria-hidden>
      {mostrados.map((p, i) => (
        <div
          key={p.id ?? i}
          style={{ animationDelay: `${i * 700}ms` }}
          className={`flutuar absolute ${POSICOES[i]} bg-surface border border-gray-100 rounded-2xl shadow-lg shadow-black/10 px-4 py-3 flex items-center gap-3 w-64`}
        >
          <div
            className={`w-10 h-10 rounded-full text-white flex items-center justify-center shrink-0 ${p.cor}`}
          >
            <UserRound size={18} />
          </div>
          <div className="min-w-0">
            {/* A especialidade vira a primeira linha: sem o nome, é ela que o cartão tem a
                dizer — e é o que a pessoa está procurando de verdade. */}
            <p className="text-sm font-bold text-gray-900 truncate">{p.especialidade}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {p.reviewCount > 0 ? (
                <>
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-[10px] font-bold text-gray-700">{p.rating.toFixed(1)}</span>
                  <span className="text-[10px] text-gray-500">
                    · {p.reviewCount} {p.reviewCount === 1 ? 'avaliação' : 'avaliações'}
                  </span>
                </>
              ) : (
                <span className="text-[10px] text-gray-400">
                  {p.id ? 'Novo na plataforma' : 'Perfil de exemplo'}
                </span>
              )}
            </div>
          </div>
          <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full shrink-0 inline-flex items-center gap-1">
            {p.online ? <Video size={9} /> : <MapPin size={9} />}
            {p.online ? 'Online' : p.cidade.split(',')[0]}
          </span>
        </div>
      ))}

      {PILULAS.map((pill, i) => (
        <div
          key={pill.rotulo}
          style={{ animationDelay: `${400 + i * 550}ms` }}
          className={`flutuar absolute ${pill.pos} bg-surface border border-gray-100 rounded-full shadow-md shadow-black/10 px-4 py-2 flex items-center gap-2`}
        >
          <span className="text-sm">{pill.emoji}</span>
          <span className="text-xs font-bold text-gray-700">{pill.rotulo}</span>
        </div>
      ))}
    </div>
  )
}
