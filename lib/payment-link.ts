/**
 * Link de pagamento da plataforma (Mercado Pago, InfinitePay, PagSeguro — qualquer um que
 * gere uma URL fixa).
 *
 * Fica numa variável de ambiente e não no banco porque é uma configuração de operação, não um
 * dado do negócio: muda quando a plataforma troca de meio de pagamento, não quando alguém usa
 * o sistema. Mesmo tratamento de PLATFORM_PIX_KEY.
 *
 * Sem a variável definida nada aparece e o Pix segue sendo a única forma — a mesma degradação
 * graciosa do resto do projeto.
 */
export function paymentLinkUrl(): string | null {
  const raw = process.env.PAYMENT_LINK_URL?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    // http:// num link de pagamento é erro de digitação com consequência séria: o paciente
    // digitaria dados de cartão numa página sem TLS.
    if (url.protocol !== 'https:') {
      console.warn('[payment-link] PAYMENT_LINK_URL precisa usar https:// — ignorada')
      return null
    }
    return url.toString()
  } catch {
    console.warn('[payment-link] PAYMENT_LINK_URL não é uma URL válida — ignorada')
    return null
  }
}
