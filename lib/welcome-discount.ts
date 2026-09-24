import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

/**
 * Campanha de lançamento: as primeiras pacientes a se cadastrar ganham 10% na consulta.
 *
 * O desconto é honrado na mão pelo admin, de propósito. Abatê-lo sozinho no preço obrigaria a
 * mexer na taxa, no repasse e nos links de pagamento do InfinitePay — que carregam valor fixo e
 * continuariam cobrando cheio, criando diferença de caixa. Aqui a campanha só registra quem tem
 * direito; quem aplica é quem cobra.
 */
export const WELCOME_DISCOUNT_SLOTS = 200
export const WELCOME_DISCOUNT_PERCENT = 10

/**
 * O que a paciente cita e o que o admin procura no painel. Derivado da posição em vez de
 * guardado: um código armazenado é mais uma coluna que pode divergir do número que a gerou.
 */
export function welcomeDiscountCode(seq: number) {
  return `NUTRI10-${String(seq).padStart(3, '0')}`
}

/**
 * Reserva a próxima vaga para esta paciente, se ainda houver.
 *
 * Chamar DEPOIS do commit do cadastro, nunca junto: se a reserva falhasse dentro da mesma
 * transação, a pessoa ficaria sem conta por causa de um cupom. Aqui o pior caso é ela se
 * cadastrar sem desconto — o cadastro em si nunca quebra.
 *
 * Retorna a posição atribuída, ou null se as vagas acabaram.
 */
export async function claimWelcomeDiscount(patientId: string): Promise<number | null> {
  // Duas transações simultâneas leem o mesmo máximo e tentam a mesma posição; o índice único
  // derruba uma delas, que tenta de novo já enxergando a posição tomada. Três tentativas cobrem
  // com folga o volume de cadastros desta plataforma.
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    // MAX e não COUNT: apagar uma paciente premiada não pode fazer a próxima receber um número
    // já usado, que ficaria batendo no índice único para sempre.
    const { _max } = await prisma.patient.aggregate({ _max: { welcomeDiscountSeq: true } })
    const seq = (_max.welcomeDiscountSeq ?? 0) + 1
    if (seq > WELCOME_DISCOUNT_SLOTS) return null

    try {
      await prisma.patient.update({
        where: { id: patientId },
        data: { welcomeDiscountSeq: seq, welcomeDiscountAt: new Date() },
      })
      return seq
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue
      throw e
    }
  }

  console.warn(`[welcome-discount] não foi possível reservar vaga para o paciente ${patientId}`)
  return null
}

/** Quantas vagas já saíram, para o painel mostrar o quanto a campanha andou. */
export async function welcomeDiscountGranted() {
  return prisma.patient.count({ where: { welcomeDiscountSeq: { not: null } } })
}
