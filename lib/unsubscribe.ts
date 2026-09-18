import { createHmac, timingSafeEqual } from 'node:crypto'
import { getEnv } from './env'

/**
 * Link de descadastro que funciona sem login.
 *
 * Quem recebe um comunicado pode não ter sessão aberta — e exigir login para sair de uma lista
 * é o tipo de atrito que faz a pessoa marcar como spam, o que custa a reputação do domínio
 * inteiro. O token é um HMAC do id do usuário com o JWT_SECRET: não precisa de tabela, não
 * expira, e não dá para forjar sem o segredo.
 *
 * Só desliga comunicados. Um token vazado, na pior hipótese, faz alguém parar de receber
 * novidades — nunca dá acesso à conta nem revela nada sobre ela.
 */
function sign(userId: string): string {
  return createHmac('sha256', getEnv().JWT_SECRET).update(`unsubscribe:${userId}`).digest('hex')
}

export function unsubscribeToken(userId: string): string {
  return sign(userId)
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = sign(userId)
  // Comparação de tamanho fixo: um `===` vaza, pelo tempo, quantos caracteres iniciais batem.
  if (token.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

export function unsubscribeUrl(baseUrl: string, userId: string): string {
  return `${baseUrl}/descadastrar?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`
}
