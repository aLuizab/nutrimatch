import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { unexpectedFailure } from '@/lib/api-failures'
import { audit } from '@/lib/audit'
import { carePlanTotalReais, normalizePaymentLink } from '@/lib/payment-link'

const bodySchema = z.object({
  kind: z.enum(['professional', 'careplan']),
  id: z.string().min(1),
  // String vazia remove o link — é como o admin desliga a cobrança de alguém sem apagar nada.
  url: z.string().trim().max(500),
})

/**
 * O admin cria o link no InfinitePay com o valor daquele profissional (ou daquele pacote) e o
 * cola aqui.
 *
 * Junto com a URL grava-se o valor para o qual ela foi criada. É o que permite detectar depois
 * o link envelhecido: o profissional edita o preço na tela dele, o link segue cobrando o valor
 * antigo, e nada no InfinitePay avisa ninguém. Sem esse registro, a diferença só apareceria
 * como buraco de caixa semanas depois.
 */
export async function PATCH(request: Request) {
  let admin
  try {
    admin = await requireRole('ADMIN')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(admin.id, 'admin-payment-links')
  if (limited) return limited

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const { kind, id, url } = parsed.data

  const normalized = url === '' ? null : normalizePaymentLink(url)
  if (url !== '' && !normalized) {
    return NextResponse.json(
      { error: 'O link precisa ser um endereço https:// válido' },
      { status: 400 }
    )
  }

  try {
    if (kind === 'professional') {
      const professional = await prisma.professional.findUnique({
        where: { id },
        include: { user: { select: { email: true } } },
      })
      if (!professional) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

      const updated = await prisma.professional.update({
        where: { id },
        data: {
          paymentLinkUrl: normalized,
          paymentLinkAmount: normalized ? professional.price : null,
          paymentLinkUpdatedAt: normalized ? new Date() : null,
        },
      })
      audit({
        actorId: admin.id,
        actorRole: 'ADMIN',
        action: 'PAYMENT_LINK_UPDATED',
        subjectId: id,
        metadata: { alvo: professional.user.email, valor: updated.paymentLinkAmount, removido: !normalized },
      })
      return NextResponse.json({ paymentLinkUrl: updated.paymentLinkUrl, paymentLinkAmount: updated.paymentLinkAmount })
    }

    const plan = await prisma.carePlan.findUnique({ where: { id } })
    if (!plan) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const total = carePlanTotalReais(plan)
    const updated = await prisma.carePlan.update({
      where: { id },
      data: {
        paymentLinkUrl: normalized,
        paymentLinkAmount: normalized ? total : null,
        paymentLinkUpdatedAt: normalized ? new Date() : null,
      },
    })
    audit({
      actorId: admin.id,
      actorRole: 'ADMIN',
      action: 'PAYMENT_LINK_UPDATED',
      subjectId: id,
      metadata: { alvo: `pacote ${plan.name}`, valor: updated.paymentLinkAmount, removido: !normalized },
    })
    return NextResponse.json({ paymentLinkUrl: updated.paymentLinkUrl, paymentLinkAmount: updated.paymentLinkAmount })
  } catch (e) {
    return unexpectedFailure('admin-payment-links', e)
  }
}
