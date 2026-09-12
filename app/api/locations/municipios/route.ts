import { NextResponse } from 'next/server'
import { isValidUf } from '@/lib/locations'
import { clientIp, rateLimit, tooManyRequests, LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

interface Municipio {
  id: number
  nome: string
}

// Cidades não mudam durante a vida de um deploy — cachear em memória evita bater na API do IBGE
// a cada letra digitada em dois campos de cadastro diferentes. Mesma limitação honesta do
// rate-limit: reseta a cada deploy, e multiplica por instância se a aplicação escalar
// horizontalmente. Aceitável para uma lista que é, na prática, estática.
const cache = new Map<string, { id: number; nome: string }[]>()

// Proxy em vez de a página chamar o IBGE direto: o CSP do app é `connect-src 'self'`, então uma
// chamada do navegador para servicodados.ibge.gov.br seria bloqueada — abrir uma exceção no CSP
// para um domínio de terceiros só para isso vale menos do que manter a política restrita e
// buscar aqui no servidor, que não tem essa restrição.
export async function GET(request: Request) {
  const limited = rateLimit(`locations:${clientIp(request)}`, LIMITS.locations.limit, LIMITS.locations.windowMs)
  if (!limited.allowed) return tooManyRequests(limited, 'Muitas requisições em pouco tempo. Aguarde alguns segundos.')

  const uf = new URL(request.url).searchParams.get('uf')?.toUpperCase() ?? ''
  if (!isValidUf(uf)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const cached = cache.get(uf)
  if (cached) return NextResponse.json({ cidades: cached })

  try {
    const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
    if (!res.ok) throw new Error(`IBGE respondeu ${res.status}`)
    const raw = (await res.json()) as Municipio[]
    const cidades = raw.map((m) => ({ id: m.id, nome: m.nome }))
    cache.set(uf, cidades)
    return NextResponse.json({ cidades })
  } catch (e) {
    console.error('[locations:municipios] falha ao buscar no IBGE', uf, e)
    return NextResponse.json({ error: 'Não foi possível carregar as cidades. Tente novamente.' }, { status: 502 })
  }
}
