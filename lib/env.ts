import { z } from 'zod'

// Fails fast at boot instead of letting the app run with a weak or placeholder secret.
// A misconfigured JWT_SECRET doesn't throw anywhere else — it just silently signs tokens
// anyone could forge, which is the worst possible failure mode for an auth system.

// Values copied straight from .env.example or common tutorials. Refusing these specifically
// catches the most likely real mistake: shipping the template unchanged.
const PLACEHOLDER_SECRETS = [
  'replace-with-a-long-random-string',
  'changeme',
  'secret',
  'your-secret-here',
  'development',
]

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET precisa ter ao menos 32 caracteres (use: openssl rand -base64 48)')
    .refine((v) => !PLACEHOLDER_SECRETS.includes(v.toLowerCase().trim()), {
      message: 'JWT_SECRET está com um valor de exemplo. Gere um real: openssl rand -base64 48',
    }),
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
})

export type Env = z.infer<typeof envSchema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached

  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Configuração inválida:\n${details}`)
  }

  cached = parsed.data
  return cached
}

/**
 * Non-throwing variant for surfaces that want to report status rather than crash.
 *
 * The errors array is always present rather than living only on the failure branch of a
 * union: this project compiles with strict: false, and without strictNullChecks TypeScript
 * will not narrow a union by its discriminant, so callers could never reach the field.
 */
export function checkEnv(): { ok: boolean; errors: string[] } {
  try {
    getEnv()
    return { ok: true, errors: [] }
  } catch (e) {
    return { ok: false, errors: [(e as Error).message] }
  }
}

/**
 * NEXT_PUBLIC_APP_URL is reported, never enforced.
 *
 * It used to live in the schema above, which meant a malformed value made getEnv() throw — and
 * getEnv() is reached from signSessionToken(), so a typo in the address used to build e-mail
 * links took down every login and signup while the static pages carried on rendering, making
 * the deploy look healthy. The variable guards nothing: it only turns relative paths into
 * absolute ones for outgoing mail. A wrong link in an e-mail deserves a loud warning; it does
 * not deserve locking everybody out of their accounts.
 */
let warnedAboutAppUrl = false

/**
 * Endereço público da aplicação, para montar links absolutos em e-mail.
 *
 * Morava em `lib/stripe.ts` por acidente histórico — era lá que os primeiros links absolutos
 * apareceram. Quando o Stripe saiu do projeto, recuperação de senha e notificações teriam ido
 * junto. Fica aqui, ao lado da função que valida a mesma variável.
 *
 * Cai para localhost quando NEXT_PUBLIC_APP_URL está ausente ou inutilizável, e avisa uma vez
 * no log. Devolver o valor cru era pior: um endereço como "meusite.com.br", sem esquema,
 * produzia links que o navegador lê como caminho relativo.
 */
export function appUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '')
  if (raw) {
    try {
      new URL(raw)
      return raw
    } catch {
      // inutilizável — avisado e substituído abaixo
    }
  }

  if (!warnedAboutAppUrl) {
    warnedAboutAppUrl = true
    console.warn('[appUrl]', appUrlProblem() ?? 'NEXT_PUBLIC_APP_URL indisponível')
  }
  return 'http://localhost:3000'
}

export function appUrlProblem(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!raw) {
    return 'NEXT_PUBLIC_APP_URL não definida — links enviados por e-mail vão apontar para http://localhost:3000'
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return (
      'NEXT_PUBLIC_APP_URL não é uma URL absoluta válida (recebido: ' +
      JSON.stringify(raw) +
      '). Use o endereço completo, com https:// na frente.'
    )
  }

  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    return 'NEXT_PUBLIC_APP_URL deveria usar https:// em produção (recebido: ' + parsed.protocol + '//)'
  }
  return null
}
