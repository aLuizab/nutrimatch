import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AuthError, requireRole } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { unexpectedFailure, configFailure } from '@/lib/api-failures'
import { audit } from '@/lib/audit'
import { sendAnnouncement } from '@/lib/notifications'

const bodySchema = z.object({
  audience: z.enum(['TODOS', 'PROFISSIONAIS', 'PACIENTES']),
  title: z.string().trim().min(4, 'O título precisa de pelo menos 4 caracteres').max(120),
  body: z.string().trim().min(10, 'Escreva o comunicado').max(4000),
})

/**
 * Converte o texto digitado em HTML.
 *
 * Escapa tudo antes de montar a marcação: o que vem daqui vai parar na caixa de entrada de
 * todo mundo, e um comunicado é exatamente o lugar onde alguém cola um trecho vindo de outro
 * sistema sem olhar. Parágrafos por linha em branco, que é como as pessoas escrevem.
 */
function toHtml(texto: string): string {
  const escapado = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return escapado
    .split(/\n\s*\n/)
    .map((p) => `<p>${p.trim().replace(/\n/g, '<br/>')}</p>`)
    .join('\n')
}

export async function POST(request: Request) {
  let admin
  try {
    admin = await requireRole('ADMIN')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  // Limite mais apertado que o das outras mutações: disparo em massa repetido por engano vira
  // o mesmo e-mail duas vezes na caixa de todo mundo, e isso não tem desfazer.
  const limited = guardMutation(admin.id, 'comunicado')
  if (limited) return limited

  const misconfigured = configFailure()
  if (misconfigured) return misconfigured

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  try {
    const resultado = await sendAnnouncement({
      audience: parsed.data.audience,
      title: parsed.data.title,
      bodyHtml: toHtml(parsed.data.body),
    })

    audit({
      actorId: admin.id,
      actorRole: 'ADMIN',
      action: 'ANNOUNCEMENT_SENT',
      metadata: { audience: parsed.data.audience, title: parsed.data.title, ...resultado },
    })

    return NextResponse.json(resultado)
  } catch (e) {
    return unexpectedFailure('comunicados', e)
  }
}
