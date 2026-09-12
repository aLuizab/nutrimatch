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
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
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

  // In production the app is served over HTTPS and the session cookie carries `secure`, so an
  // http:// base URL would produce redirect targets that silently drop the session.
  if (parsed.data.NODE_ENV === 'production') {
    const url = parsed.data.NEXT_PUBLIC_APP_URL
    if (url && !url.startsWith('https://')) {
      throw new Error('Configuração inválida:\n  - NEXT_PUBLIC_APP_URL deve usar https:// em produção')
    }
  }

  cached = parsed.data
  return cached
}

/** Non-throwing variant for surfaces that want to report status rather than crash. */
export function checkEnv(): { ok: true } | { ok: false; errors: string[] } {
  try {
    getEnv()
    return { ok: true }
  } catch (e) {
    return { ok: false, errors: [(e as Error).message] }
  }
}
