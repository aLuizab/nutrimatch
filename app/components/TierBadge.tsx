import { Award, ShieldCheck, Sparkles } from 'lucide-react'
import { tierDefinition } from '@/lib/reputation'

// Estilo por nível. "Novo" não ganha selo nenhum: um selo que todo mundo tem no primeiro dia
// não informa nada, e marcar visualmente quem acabou de chegar penaliza exatamente quem ainda
// não teve chance de construir histórico.
const STYLES: Record<string, { icon: typeof Award; className: string }> = {
  CONFIAVEL: { icon: ShieldCheck, className: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  DESTAQUE: { icon: Sparkles, className: 'text-blue-700 bg-blue-50 border-blue-100' },
  REFERENCIA: { icon: Award, className: 'text-amber-700 bg-amber-50 border-amber-200' },
}

export default function TierBadge({ tier, size = 'sm' }: { tier: string; size?: 'sm' | 'md' }) {
  const style = STYLES[tier]
  if (!style) return null

  const { icon: Icon, className } = style
  const def = tierDefinition(tier)
  return (
    <span
      title={def.description}
      className={`inline-flex items-center gap-1 font-bold border rounded-md ${className} ${
        size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[10px] px-2 py-0.5'
      }`}
    >
      <Icon size={size === 'md' ? 13 : 11} />
      {def.label}
    </span>
  )
}
