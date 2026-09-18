import { reaisToCents } from './money'

/**
 * Links de pagamento do InfinitePay, um por profissional e um por pacote.
 *
 * Um link do InfinitePay cobra um valor fixo, e cada profissional cobra o seu — daí um link por
 * profissional em vez de um único da plataforma. Quem cria é o admin, depois que o nutricionista
 * define o preço dele; o dinheiro entra na conta da plataforma, que repassa o valor menos a taxa
 * pela chave Pix do profissional. É por isso que a chave Pix continua obrigatória mesmo agora
 * que o paciente não a usa mais: ela deixou de ser como se cobra e passou a ser como se paga.
 */

/** Um link só é aceito se for https. Pagamento em página sem TLS não é opção. */
export function normalizePaymentLink(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

export interface ResolvedPaymentLink {
  url: string
  /** O valor que o link cobra, conforme registrado quando foi criado. */
  amountCents: number
  /**
   * Preenchido quando o preço atual não é mais o do link. O link continua cobrando o valor
   * antigo e nada no InfinitePay avisa: o profissional edita o preço na tela dele e a diferença
   * só apareceria como buraco de caixa semanas depois. Com isto, aparece na hora — para o admin,
   * nunca para o paciente, que não tem o que fazer com essa informação.
   */
  expectedCents: number | null
}

function resolve(
  url: string | null | undefined,
  linkAmountReais: number | null | undefined,
  currentPriceReais: number
): ResolvedPaymentLink | null {
  const normalized = normalizePaymentLink(url)
  if (!normalized) return null

  // Sem valor registrado, assume-se que o link foi criado para o preço de hoje. É o melhor
  // palpite disponível e evita acusar divergência em link antigo, cadastrado antes deste campo.
  const amountReais = linkAmountReais ?? currentPriceReais
  return {
    url: normalized,
    amountCents: reaisToCents(amountReais),
    expectedCents: amountReais !== currentPriceReais ? reaisToCents(currentPriceReais) : null,
  }
}

export function professionalPaymentLink(
  professional:
    | { price: number; paymentLinkUrl?: string | null; paymentLinkAmount?: number | null }
    | null
    | undefined
): ResolvedPaymentLink | null {
  if (!professional) return null
  return resolve(professional.paymentLinkUrl, professional.paymentLinkAmount, professional.price)
}

/** O pacote cobra consultas x valor por consulta, então o preço de referência é o total. */
export function carePlanTotalReais(plan: { pricePerConsultation: number; consultations: number }): number {
  return plan.pricePerConsultation * plan.consultations
}

export function carePlanPaymentLink(
  plan:
    | {
        pricePerConsultation: number
        consultations: number
        paymentLinkUrl?: string | null
        paymentLinkAmount?: number | null
      }
    | null
    | undefined
): ResolvedPaymentLink | null {
  if (!plan) return null
  return resolve(plan.paymentLinkUrl, plan.paymentLinkAmount, carePlanTotalReais(plan))
}

/** Pode este profissional receber pela plataforma? Precisa dos dois lados do caminho. */
export function canChargeFor(professional: {
  price: number
  paymentLinkUrl?: string | null
  pixKey?: string | null
}): boolean {
  return professionalPaymentLink(professional) !== null && Boolean(professional.pixKey?.trim())
}
