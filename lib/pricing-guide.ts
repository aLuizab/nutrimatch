import { prisma } from './prisma'
import { SPECIALTY_NAMES } from './specialties'

export interface SpecialtyPriceStats {
  specialty: string
  count: number
  min: number
  median: number
  average: number
  max: number
}

function median(sortedAsc: number[]): number {
  const mid = Math.floor(sortedAsc.length / 2)
  return sortedAsc.length % 2 === 0 ? (sortedAsc[mid - 1] + sortedAsc[mid]) / 2 : sortedAsc[mid]
}

/**
 * Estatísticas de preço por especialidade, entre profissionais ativos na plataforma — a base do
 * guia de preços que ajuda quem está definindo (ou revendo) o próprio valor a se posicionar em
 * relação ao que já existe. `specialties` é String[] no schema (até 3 por profissional), então
 * um profissional entra na contagem de cada especialidade que tem, não só a primeira.
 *
 * Agrupamento em memória, não no banco: `groupBy` do Prisma não desmonta arrays, e o volume de
 * profissionais numa plataforma neste estágio não justifica SQL de desaninhamento de array só
 * para isso. Revisar se a base crescer para milhares de profissionais.
 */
export async function getPriceGuide(): Promise<SpecialtyPriceStats[]> {
  const professionals = await prisma.professional.findMany({
    where: { status: 'ACTIVE' },
    select: { price: true, specialties: true },
  })

  const bySpecialty = new Map<string, number[]>()
  for (const p of professionals) {
    for (const specialty of p.specialties) {
      const list = bySpecialty.get(specialty) ?? []
      list.push(p.price)
      bySpecialty.set(specialty, list)
    }
  }

  return SPECIALTY_NAMES.map((specialty) => {
    const prices = (bySpecialty.get(specialty) ?? []).slice().sort((a, b) => a - b)
    if (prices.length === 0) {
      return { specialty, count: 0, min: 0, median: 0, average: 0, max: 0 }
    }
    const sum = prices.reduce((total, p) => total + p, 0)
    return {
      specialty,
      count: prices.length,
      min: prices[0],
      median: Math.round(median(prices)),
      average: Math.round(sum / prices.length),
      max: prices[prices.length - 1],
    }
  })
}
