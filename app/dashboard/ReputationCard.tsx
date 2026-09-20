import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import TierBadge from '../components/TierBadge'
import { nextTierProgress, tierDefinition, TIERS } from '@/lib/reputation'

/**
 * Reputação do profissional no painel: nível atual e — o que importa de verdade — exatamente o
 * que falta para o próximo. Um selo sozinho é decoração; a meta concreta ("faltam 3 consultas")
 * é o que faz alguém voltar.
 */
export default function ReputationCard({
  reputationScore,
  fulfilledCount,
  tier,
}: {
  reputationScore: number
  fulfilledCount: number
  tier: string
}) {
  const progress = nextTierProgress(reputationScore, fulfilledCount)
  const def = tierDefinition(tier)
  const tierIndex = TIERS.findIndex((t) => t.id === tier)

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Sua reputação</p>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">{def.label}</h2>
            <TierBadge tier={tier} size="md" />
          </div>
          <p className="text-sm text-gray-500 mt-1">{def.description}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">{Math.round(reputationScore * 100)}</p>
          <p className="text-xs text-gray-400">de 100</p>
        </div>
      </div>

      {/* Trilha dos níveis: ver onde está e quanto falta é o que dá sentido ao número acima. */}
      <div className="flex items-center gap-1 mt-5">
        {TIERS.map((t, i) => (
          <div
            key={t.id}
            title={t.label}
            className={`h-1.5 flex-1 rounded-full ${i <= tierIndex ? 'bg-emerald-500' : 'bg-gray-100'}`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        {TIERS.map((t, i) => (
          <span key={t.id} className={`text-[10px] ${i <= tierIndex ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
            {t.label}
          </span>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100">
        {progress ? (
          <>
            <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
              <TrendingUp size={15} className="text-emerald-500" /> Para chegar em {progress.next.label}
            </p>
            <ul className="mt-2 space-y-1">
              {progress.missing.map((m) => (
                <li key={m} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span> Falta {m}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-emerald-700 font-medium">
            Você está no nível mais alto da plataforma. Mantendo as consultas em dia, continua aqui.
          </p>
        )}
        <Link
          href="/como-funciona-profissional#reputacao"
          className="inline-block mt-3 text-xs text-emerald-600 hover:underline"
        >
          Como a reputação é calculada →
        </Link>
      </div>
    </div>
  )
}
