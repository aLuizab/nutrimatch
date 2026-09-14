// Geração do BR Code (Pix "copia e cola"), no formato EMV® QRCPS que o Bacen adotou.
//
// Por que gerar em vez de só mostrar a chave: o código carrega **valor** e **identificador**
// junto. Sem isso, a conferência manual no extrato vira adivinhação — dois pacientes pagando
// R$150 no mesmo dia seriam indistinguíveis. Com o txid, cada consulta tem a própria marca.
//
// Nada aqui fala com banco nenhum: é só a montagem da string que o app do banco lê. A
// confirmação de que o dinheiro caiu continua sendo humana (ver a fila no painel do admin),
// porque chave Pix estática não emite webhook.

export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM'

export const PIX_KEY_TYPES: { id: PixKeyType; label: string; hint: string }[] = [
  { id: 'CPF', label: 'CPF', hint: 'Somente números' },
  { id: 'CNPJ', label: 'CNPJ', hint: 'Somente números' },
  { id: 'EMAIL', label: 'E-mail', hint: 'seu@email.com' },
  { id: 'PHONE', label: 'Telefone', hint: 'Com DDD, ex: 11999999999' },
  { id: 'RANDOM', label: 'Chave aleatória', hint: 'A chave EVP gerada pelo seu banco' },
]

/** Um campo no formato TLV: id (2) + tamanho (2, com zero à esquerda) + valor. */
function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`
}

/**
 * CRC16/CCITT-FALSE — polinômio 0x1021, valor inicial 0xFFFF. É o dígito verificador do BR
 * Code: o app do banco recusa o código inteiro se ele não bater.
 */
export function crc16(payload: string): string {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Remove acento e caractere fora do ASCII imprimível. Nome e cidade viajam no código e alguns
 * bancos rejeitam (ou corrompem) o que sai dessa faixa.
 */
function ascii(value: string, max: number): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .slice(0, max)
}

/** txid aceita só alfanumérico, até 25 caracteres. */
export function sanitizeTxid(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***'
}

export interface PixPayloadInput {
  key: string
  /** Nome do recebedor, como aparece no app do pagador. */
  merchantName: string
  merchantCity: string
  /** Em centavos. Omitido gera código sem valor definido, que o pagador digita. */
  amountCents?: number
  txid?: string
}

export function buildPixPayload(input: PixPayloadInput): string {
  const merchantAccount =
    field('00', 'br.gov.bcb.pix') + field('01', input.key.trim())

  const parts = [
    field('00', '01'),
    // '12' = uso único. Cada consulta gera o seu, então reaproveitar não faria sentido.
    field('01', '12'),
    field('26', merchantAccount),
    field('52', '0000'),
    field('53', '986'), // BRL
    ...(input.amountCents != null && input.amountCents > 0
      ? [field('54', (input.amountCents / 100).toFixed(2))]
      : []),
    field('58', 'BR'),
    field('59', ascii(input.merchantName, 25) || 'RECEBEDOR'),
    field('60', ascii(input.merchantCity, 15) || 'SAO PAULO'),
    field('62', field('05', sanitizeTxid(input.txid ?? '***'))),
  ].join('')

  // O CRC é calculado sobre a string já contendo '6304', e só depois o valor é anexado.
  const withCrcMarker = `${parts}6304`
  return `${withCrcMarker}${crc16(withCrcMarker)}`
}

/**
 * Identificador da cobrança. Prefixo + trecho do id da consulta: curto o bastante para o limite
 * de 25 caracteres do txid e ainda assim rastreável até a linha certa no banco.
 */
export function txidForAppointment(appointmentId: string): string {
  return sanitizeTxid(`NM${appointmentId.slice(-14).toUpperCase()}`)
}

export function txidForEnrollment(enrollmentId: string): string {
  return sanitizeTxid(`NMP${enrollmentId.slice(-13).toUpperCase()}`)
}

/** Mascara a chave para exibição em tela (o nutricionista confere sem expor o dado inteiro). */
export function maskPixKey(key: string, type: string | null): string {
  if (type === 'EMAIL') {
    const [user, domain] = key.split('@')
    if (!domain) return key
    return `${user.slice(0, 2)}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`
  }
  if (key.length <= 6) return key
  return `${key.slice(0, 3)}${'*'.repeat(key.length - 6)}${key.slice(-3)}`
}
