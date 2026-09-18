import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe'
import { unexpectedFailure } from '@/lib/api-failures'

const bodySchema = z.object({ userId: z.string().min(1), token: z.string().min(1) })

/**
 * Desliga os comunicados. Não exige sessão: quem recebe o e-mail pode não ter login aberto, e
 * exigir um é o atrito que faz a pessoa marcar como spam — o que custa a reputação de envio do
 * domínio inteiro, muito mais caro do que uma baixa na lista.
 *
 * O token é um HMAC do id com o JWT_SECRET, então um id sozinho não serve para nada. E o único
 * efeito possível é parar de receber novidades: nunca toca em nada além deste campo.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Link inválido' }, { status: 400 })

  const { userId, token } = parsed.data
  if (!verifyUnsubscribeToken(userId, token)) {
    return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 403 })
  }

  try {
    // updateMany e não update: um id inexistente com token válido é impossível, mas se fosse,
    // update lançaria e viraria 500 numa ação que deveria terminar em silêncio.
    await prisma.user.updateMany({ where: { id: userId }, data: { notifyNews: false } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return unexpectedFailure('descadastrar', e)
  }
}
