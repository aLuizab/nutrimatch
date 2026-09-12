import { NextResponse } from 'next/server'
import { getPriceGuide } from '@/lib/pricing-guide'
import { clientIp, rateLimit, tooManyRequests, LIMITS } from '@/lib/rate-limit'

// Agregado público, sem dado de nenhum profissional identificável (só min/mediana/média/máx por
// especialidade) — por isso sem autenticação, alcançável tanto no cadastro (antes de existir
// conta) quanto em /configuracoes depois.
export async function GET(request: Request) {
  const limited = rateLimit(`pricing-guide:${clientIp(request)}`, LIMITS.pricingGuide.limit, LIMITS.pricingGuide.windowMs)
  if (!limited.allowed) return tooManyRequests(limited, 'Muitas requisições em pouco tempo. Aguarde alguns segundos.')

  const guide = await getPriceGuide()
  return NextResponse.json({ guide })
}
